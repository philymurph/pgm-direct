const STOCK_LABELS: Record<string, { label: string; className: string }> = {
  IN_STOCK: { label: "In stock", className: "bg-green-100 text-green-800" },
  LOW_STOCK: { label: "Low stock", className: "bg-amber-100 text-amber-800" },
  OUT_OF_STOCK: { label: "Out of stock", className: "bg-red-100 text-red-800" },
  AVAILABLE_TO_ORDER: {
    label: "Available to order",
    className: "bg-blue-100 text-blue-800",
  },
  DISCONTINUED: {
    label: "Discontinued",
    className: "bg-slate-200 text-slate-600",
  },
};

export function StockBadge({ status }: { status: string }) {
  const info = STOCK_LABELS[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${info.className}`}
    >
      {info.label}
    </span>
  );
}
