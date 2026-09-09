import "server-only";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { prisma } from "./db";
import { getSession } from "./auth";
import { calculateLineTotals, calculateVat } from "./pricing";
import { toNumber } from "./money";

const GUEST_CART_COOKIE = "pgm_cart_token";
const GUEST_CART_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

/** Resolves (and creates if needed) the cart for the current visitor — logged in or guest. */
export async function getOrCreateCart() {
  const session = await getSession();

  if (session?.customerId) {
    return prisma.cart.upsert({
      where: { customerId: session.customerId },
      create: { customerId: session.customerId },
      update: {},
      include: cartInclude,
    });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_CART_COOKIE)?.value;

  if (!token) {
    token = nanoid();
    cookieStore.set(GUEST_CART_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_CART_MAX_AGE,
    });
  }

  return prisma.cart.upsert({
    where: { sessionToken: token },
    create: { sessionToken: token },
    update: {},
    include: cartInclude,
  });
}

const cartInclude = {
  items: {
    include: {
      product: { include: { images: true, inventory: true, vatRate: true } },
      variant: { include: { inventory: true } },
    },
  },
} as const;

/**
 * Read-only lookup for rendering (GET requests can't set cookies in Next.js).
 * Returns null instead of creating a cart/cookie when the visitor has none yet.
 */
async function findExistingCart() {
  const session = await getSession();

  if (session?.customerId) {
    return prisma.cart.findUnique({
      where: { customerId: session.customerId },
      include: cartInclude,
    });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!token) return null;

  return prisma.cart.findUnique({
    where: { sessionToken: token },
    include: cartInclude,
  });
}

export type CartWithItems = Awaited<ReturnType<typeof getOrCreateCart>>;

/** Merges a guest cart into the customer's cart, called right after login/registration. */
export async function mergeGuestCartIntoCustomer(customerId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!token) return;

  const guestCart = await prisma.cart.findUnique({
    where: { sessionToken: token },
    include: cartInclude,
  });
  if (!guestCart) return;

  const customerCart = await prisma.cart.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
    include: cartInclude,
  });

  for (const item of guestCart.items) {
    await prisma.cartItem.upsert({
      where: {
        cartId_productId_variantId: {
          cartId: customerCart.id,
          productId: item.productId,
          variantId: item.variantId ?? "",
        },
      },
      create: {
        cartId: customerCart.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      },
      update: { quantity: { increment: item.quantity } },
    });
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
  cookieStore.delete(GUEST_CART_COOKIE);
}

export interface AddToCartInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/** Adds an item to the cart, clamping quantity to available stock unless backorder is allowed. */
export async function addToCart({
  productId,
  variantId,
  quantity,
}: AddToCartInput) {
  if (quantity < 1) throw new Error("Quantity must be at least 1");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { inventory: true },
  });
  if (!product || !product.isActive) throw new Error("Product not available");

  const cart = await getOrCreateCart();

  const existing = cart.items.find(
    (i) =>
      i.productId === productId &&
      (i.variantId ?? null) === (variantId ?? null),
  );
  const desiredQuantity = (existing?.quantity ?? 0) + quantity;

  await assertStockAvailable(product, variantId ?? null, desiredQuantity);

  await prisma.cartItem.upsert({
    where: {
      cartId_productId_variantId: {
        cartId: cart.id,
        productId,
        variantId: variantId ?? "",
      },
    },
    create: {
      cartId: cart.id,
      productId,
      variantId: variantId ?? null,
      quantity,
    },
    update: { quantity: desiredQuantity },
  });

  return getOrCreateCart();
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
) {
  if (quantity < 1) return removeCartItem(cartItemId);

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { product: { include: { inventory: true } } },
  });
  if (!item) throw new Error("Cart item not found");

  await assertStockAvailable(item.product, item.variantId, quantity);
  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
  return getOrCreateCart();
}

export async function removeCartItem(cartItemId: string) {
  await prisma.cartItem.delete({ where: { id: cartItemId } }).catch(() => null);
  return getOrCreateCart();
}

async function assertStockAvailable(
  product: {
    allowBackorder: boolean;
    name: string;
    inventory: { quantityOnHand: number; quantityReserved: number } | null;
  },
  _variantId: string | null,
  desiredQuantity: number,
) {
  if (product.allowBackorder) return;
  const available =
    (product.inventory?.quantityOnHand ?? 0) -
    (product.inventory?.quantityReserved ?? 0);
  if (desiredQuantity > available) {
    throw new Error(
      `Only ${Math.max(available, 0)} unit(s) of "${product.name}" are available`,
    );
  }
}

/** Computes a fully priced, VAT-broken-down view of the cart. Always the server's numbers, never the client's. */
export async function getCartSummary() {
  const cart = await findExistingCart();

  const lines = (cart?.items ?? []).map((item) => {
    const unitPriceExVat =
      item.variant?.priceExVatOverride ?? item.product.sellingPriceExVat;
    const totals = calculateLineTotals({
      unitPriceExVat,
      vatRatePercent: item.product.vatRate.ratePercent,
      quantity: item.quantity,
    });
    const available =
      (item.variant?.inventory?.quantityOnHand ??
        item.product.inventory?.quantityOnHand ??
        0) -
      (item.variant?.inventory?.quantityReserved ??
        item.product.inventory?.quantityReserved ??
        0);

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      image: item.product.images[0]?.url ?? null,
      variantId: item.variantId,
      variantName: item.variant?.name ?? null,
      quantity: item.quantity,
      unitPriceExVat: toNumber(totals.unitPriceExVat),
      vatRatePercent: toNumber(totals.vatRatePercent),
      lineTotalExVat: toNumber(totals.lineTotalExVat),
      lineVatTotal: toNumber(totals.lineVatTotal),
      lineTotalIncVat: toNumber(totals.lineTotalIncVat),
      stockAvailable: item.product.allowBackorder ? null : available,
      exceedsStock: !item.product.allowBackorder && item.quantity > available,
    };
  });

  const subtotalExVat = lines.reduce((sum, l) => sum + l.lineTotalExVat, 0);
  const vatTotal = lines.reduce((sum, l) => sum + l.lineVatTotal, 0);
  const totalIncVat = lines.reduce((sum, l) => sum + l.lineTotalIncVat, 0);

  return {
    cartId: cart?.id ?? null,
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalExVat,
    vatTotal,
    totalIncVat,
    hasStockIssues: lines.some((l) => l.exceedsStock),
  };
}

export { calculateVat };

export async function getCartItemCount(): Promise<number> {
  const cart = await findExistingCart();
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}
