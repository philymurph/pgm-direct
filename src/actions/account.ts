"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";
import { addToCart } from "@/lib/cart";

export async function toggleFavouriteAction(productId: string) {
  const session = await requireSession();
  if (!session.customerId)
    throw new Error("No customer profile for this session");

  const existing = await prisma.favouriteProduct.findUnique({
    where: {
      customerId_productId: { customerId: session.customerId, productId },
    },
  });

  if (existing) {
    await prisma.favouriteProduct.delete({ where: { id: existing.id } });
  } else {
    await prisma.favouriteProduct.create({
      data: { customerId: session.customerId, productId },
    });
  }

  revalidatePath("/account/favourites");
  return { favourited: !existing };
}

export interface AddressFormState {
  success: boolean;
  error?: string;
}

export async function saveAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const session = await requireSession();
  if (!session.customerId)
    return { success: false, error: "No customer profile for this session" };

  const parsed = addressSchema.safeParse({
    label: formData.get("label") || undefined,
    type: formData.get("type"),
    contactName: formData.get("contactName"),
    companyName: formData.get("companyName") || undefined,
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    county: formData.get("county") || undefined,
    postcode: formData.get("postcode") || undefined,
    country: formData.get("country") || "IE",
    phone: formData.get("phone") || undefined,
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check the address details",
    };
  }

  await prisma.customerAddress.create({
    data: { ...parsed.data, customerId: session.customerId },
  });
  revalidatePath("/account/addresses");
  return { success: true };
}

export async function deleteAddressAction(addressId: string) {
  const session = await requireSession();
  if (!session.customerId)
    throw new Error("No customer profile for this session");

  await prisma.customerAddress.deleteMany({
    where: { id: addressId, customerId: session.customerId },
  });
  revalidatePath("/account/addresses");
}

/** Re-adds every still-active product from a past order to the current cart. */
export async function reorderAction(orderId: string) {
  const session = await requireSession();
  if (!session.customerId)
    throw new Error("No customer profile for this session");

  const order = await prisma.order.findFirstOrThrow({
    where: { id: orderId, customerId: session.customerId },
    include: { items: true },
  });

  for (const item of order.items) {
    if (!item.productId) continue;
    try {
      await addToCart({ productId: item.productId, quantity: item.quantity });
    } catch {
      // Skip lines that are now out of stock/discontinued rather than failing the whole reorder.
    }
  }

  revalidatePath("/cart");
}
