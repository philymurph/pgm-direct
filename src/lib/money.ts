import { Decimal } from "@prisma/client/runtime/library";

export type Money = Decimal | number | string;

export function toDecimal(value: Money): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

/** Rounds to 2 decimal places using standard half-up rounding, as required for currency. */
export function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function formatEuro(value: Money): string {
  const num = toDecimal(value).toNumber();
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

export function toNumber(value: Money): number {
  return toDecimal(value).toNumber();
}
