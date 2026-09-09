import { formatEuro, type Money } from "@/lib/money";
import { getVatDisplayMode } from "@/lib/vat-preference";

interface PriceDisplayProps {
  priceExVat: Money;
  priceIncVat: Money;
  vatRatePercent: Money;
  className?: string;
  size?: "sm" | "lg";
}

/** Shows whichever of inc/ex VAT the customer prefers as primary, with the other as a breakdown. */
export async function PriceDisplay({
  priceIncVat,
  priceExVat,
  vatRatePercent,
  className,
  size = "sm",
}: PriceDisplayProps) {
  const mode = await getVatDisplayMode();
  const primary = mode === "ex" ? priceExVat : priceIncVat;
  const primaryLabel = mode === "ex" ? "ex. VAT" : "inc. VAT";
  const secondary = mode === "ex" ? priceIncVat : priceExVat;
  const secondaryLabel = mode === "ex" ? "inc. VAT" : "ex. VAT";

  return (
    <div className={className}>
      <div
        className={
          size === "lg"
            ? "text-3xl font-bold text-slate-900"
            : "text-lg font-semibold text-slate-900"
        }
      >
        {formatEuro(primary)}
        <span className="ml-1 text-xs font-normal text-slate-500">
          {primaryLabel}
        </span>
      </div>
      <div className="text-xs text-slate-500">
        {formatEuro(secondary)} {secondaryLabel} (VAT {Number(vatRatePercent)}%)
      </div>
    </div>
  );
}
