import { Decimal } from "@prisma/client/runtime/library";
import { roundMoney, toDecimal, type Money } from "./money";

export interface VatBreakdown {
  priceExVat: Decimal;
  vatRatePercent: Decimal;
  vatAmount: Decimal;
  priceIncVat: Decimal;
}

/**
 * Computes the VAT amount and inc-VAT price for a given ex-VAT price and
 * configurable VAT rate. VAT rates are never hardcoded — every call site
 * must pass the rate that applies to the specific product/order line.
 */
export function calculateVat(
  priceExVat: Money,
  vatRatePercent: Money,
): VatBreakdown {
  const exVat = toDecimal(priceExVat);
  const rate = toDecimal(vatRatePercent);
  const vatAmount = roundMoney(exVat.mul(rate).div(100));
  const incVat = roundMoney(exVat.add(vatAmount));

  return {
    priceExVat: roundMoney(exVat),
    vatRatePercent: rate,
    vatAmount,
    priceIncVat: incVat,
  };
}

export interface LineItemInput {
  unitPriceExVat: Money;
  vatRatePercent: Money;
  quantity: number;
}

export interface LineItemTotals {
  unitPriceExVat: Decimal;
  vatRatePercent: Decimal;
  lineTotalExVat: Decimal;
  lineVatTotal: Decimal;
  lineTotalIncVat: Decimal;
}

export function calculateLineTotals({
  unitPriceExVat,
  vatRatePercent,
  quantity,
}: LineItemInput): LineItemTotals {
  const unitExVat = roundMoney(toDecimal(unitPriceExVat));
  const rate = toDecimal(vatRatePercent);
  const lineTotalExVat = roundMoney(unitExVat.mul(quantity));
  const lineVatTotal = roundMoney(lineTotalExVat.mul(rate).div(100));
  const lineTotalIncVat = roundMoney(lineTotalExVat.add(lineVatTotal));

  return {
    unitPriceExVat: unitExVat,
    vatRatePercent: rate,
    lineTotalExVat,
    lineVatTotal,
    lineTotalIncVat,
  };
}

export interface OrderTotalsInput {
  lines: LineItemTotals[];
  shippingExVat: Money;
  shippingVatRatePercent: Money;
  discountTotal?: Money;
}

export interface OrderTotals {
  subtotalExVat: Decimal;
  vatTotal: Decimal;
  shippingExVat: Decimal;
  discountTotal: Decimal;
  totalIncVat: Decimal;
}

/**
 * Server-side authoritative order total calculation. The browser never
 * supplies totals — every checkout recomputes this from current DB prices.
 */
export function calculateOrderTotals({
  lines,
  shippingExVat,
  shippingVatRatePercent,
  discountTotal = 0,
}: OrderTotalsInput): OrderTotals {
  let subtotalExVat = new Decimal(0);
  let vatTotal = new Decimal(0);

  for (const line of lines) {
    subtotalExVat = subtotalExVat.add(line.lineTotalExVat);
    vatTotal = vatTotal.add(line.lineVatTotal);
  }

  const shipping = calculateVat(shippingExVat, shippingVatRatePercent);
  const discount = roundMoney(toDecimal(discountTotal));

  subtotalExVat = roundMoney(subtotalExVat);
  vatTotal = roundMoney(vatTotal.add(shipping.vatAmount));

  const totalIncVat = roundMoney(
    subtotalExVat.add(vatTotal).add(shipping.priceExVat).sub(discount),
  );

  return {
    subtotalExVat,
    vatTotal,
    shippingExVat: shipping.priceExVat,
    discountTotal: discount,
    totalIncVat,
  };
}
