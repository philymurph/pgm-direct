import "server-only";
import { prisma } from "./db";
import { getCartSummary } from "./cart";
import { calculateLineTotals, calculateOrderTotals } from "./pricing";
import { INVENTORY_RESERVATION_TTL_MS } from "./checkout-config";
import {
  InventoryUnavailableError,
  reserveInventoryForOrderLine,
} from "./inventory";
import type { checkoutSchema } from "./validation";
import type { z } from "zod";

type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {}

/**
 * Recomputes everything from the database (prices, VAT, stock, shipping,
 * discount) and creates a PENDING_PAYMENT order. The browser's cart totals
 * are never trusted — this is the single source of truth for order pricing.
 */
export async function createPendingOrderFromCart(
  input: CheckoutInput,
  customerId: string | null,
) {
  const summary = await getCartSummary();
  if (summary.lines.length === 0) throw new CheckoutError("Your cart is empty");
  if (summary.lines.some((line) => !line.isPurchasable))
    throw new CheckoutError("Some items in your cart are no longer available");
  if (summary.hasStockIssues)
    throw new CheckoutError("Some items in your cart exceed available stock");

  const shippingMethod = await prisma.shippingMethod.findUnique({
    where: { id: input.shippingMethodId },
  });
  if (!shippingMethod || !shippingMethod.isActive)
    throw new CheckoutError("Please select a valid delivery method");
  if (shippingMethod.isQuoteRequired)
    throw new CheckoutError("This delivery method requires a manual quote");

  const defaultVatRate = await prisma.vatRate.findFirst({
    where: { isDefault: true },
  });
  if (!defaultVatRate) throw new CheckoutError("VAT configuration is missing");

  const freeThreshold = shippingMethod.freeAboveSubtotal
    ? Number(shippingMethod.freeAboveSubtotal)
    : null;
  const shippingExVat =
    freeThreshold !== null && summary.subtotalExVat >= freeThreshold
      ? 0
      : Number(shippingMethod.price);

  let discountTotal = 0;
  let discountId: string | null = null;
  if (input.discountCode) {
    const discount = await prisma.discount.findUnique({
      where: { code: input.discountCode.toUpperCase() },
    });
    if (!discount || !discount.isActive)
      throw new CheckoutError("Invalid discount code");
    if (discount.expiresAt && discount.expiresAt < new Date())
      throw new CheckoutError("This discount code has expired");
    if (discount.startsAt && discount.startsAt > new Date())
      throw new CheckoutError("This discount code is not yet active");
    if (discount.maxUses && discount.usedCount >= discount.maxUses)
      throw new CheckoutError("This discount code has been fully redeemed");
    if (
      discount.minOrderValue &&
      summary.subtotalExVat < Number(discount.minOrderValue)
    ) {
      throw new CheckoutError(
        `This discount requires a minimum order of €${discount.minOrderValue}`,
      );
    }
    discountTotal =
      discount.type === "PERCENTAGE"
        ? Math.round(
            ((summary.subtotalExVat * Number(discount.value)) / 100) * 100,
          ) / 100
        : Number(discount.value);
    discountId = discount.id;
  }

  const lineTotals = summary.lines.map((l) =>
    calculateLineTotals({
      unitPriceExVat: l.unitPriceExVat,
      vatRatePercent: l.vatRatePercent,
      quantity: l.quantity,
    }),
  );

  const totals = calculateOrderTotals({
    lines: lineTotals,
    shippingExVat,
    shippingVatRatePercent: defaultVatRate.ratePercent,
    discountTotal,
  });

  const billing = input.sameAsBilling ? input.billing : input.billing;
  const delivery = input.sameAsBilling ? input.billing : input.delivery;

  try {
    return await prisma.$transaction(async (tx) => {
      const allocations = new Map<
        string,
        Awaited<ReturnType<typeof reserveInventoryForOrderLine>>
      >();
      const linesByInventoryKey = [...summary.lines].sort((a, b) =>
        `${a.productId}:${a.variantId ?? ""}`.localeCompare(
          `${b.productId}:${b.variantId ?? ""}`,
        ),
      );

      for (const line of linesByInventoryKey) {
        allocations.set(
          line.id,
          await reserveInventoryForOrderLine(tx, {
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          }),
        );
      }

      const created = await tx.order.create({
        data: {
          orderNumber: "PENDING",
          customerId: customerId ?? undefined,
          guestEmail: customerId ? undefined : input.guestEmail,
          sourceCartId: summary.cartId ?? undefined,
          inventoryReservationExpiresAt: new Date(
            Date.now() + INVENTORY_RESERVATION_TTL_MS,
          ),
          purchaseReference: input.purchaseReference,
          shippingMethodId: shippingMethod.id,
          discountId: discountId ?? undefined,
          billingContactName: billing.contactName,
          billingCompanyName: billing.companyName,
          billingVatNumber: billing.vatNumber,
          billingLine1: billing.line1,
          billingLine2: billing.line2,
          billingCity: billing.city,
          billingCounty: billing.county,
          billingPostcode: billing.postcode,
          billingCountry: billing.country,
          billingPhone: billing.phone,
          deliveryContactName: delivery.contactName,
          deliveryCompanyName: delivery.companyName,
          deliveryLine1: delivery.line1,
          deliveryLine2: delivery.line2,
          deliveryCity: delivery.city,
          deliveryCounty: delivery.county,
          deliveryPostcode: delivery.postcode,
          deliveryCountry: delivery.country,
          deliveryPhone: delivery.phone,
          subtotalExVat: totals.subtotalExVat,
          vatTotal: totals.vatTotal,
          shippingExVat: totals.shippingExVat,
          discountTotal: totals.discountTotal,
          totalIncVat: totals.totalIncVat,
          items: {
            create: summary.lines.map((line, i) => {
              const allocation = allocations.get(line.id)!;
              return {
                productId: line.productId,
                variantId: line.variantId ?? undefined,
                sku: allocation.sku,
                name: line.variantName
                  ? `${line.productName} — ${line.variantName}`
                  : line.productName,
                quantity: line.quantity,
                allowBackorder: allocation.allowBackorder,
                inventoryAllocationStatus: allocation.inventoryAllocationStatus,
                unitPriceExVat: lineTotals[i].unitPriceExVat,
                vatRatePercent: lineTotals[i].vatRatePercent,
                lineTotalExVat: lineTotals[i].lineTotalExVat,
                lineVatTotal: lineTotals[i].lineVatTotal,
                lineTotalIncVat: lineTotals[i].lineTotalIncVat,
              };
            }),
          },
        },
      });

      const orderNumber = `PGM-${created.createdAt.getFullYear()}-${String(created.invoiceSeq).padStart(5, "0")}`;
      await tx.order.update({
        where: { id: created.id },
        data: { orderNumber },
      });

      return { ...created, orderNumber };
    });
  } catch (error) {
    if (error instanceof InventoryUnavailableError) {
      throw new CheckoutError(error.message);
    }
    throw error;
  }
}
