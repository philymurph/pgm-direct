import Link from "next/link";

export function Pagination({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-2 text-sm"
      aria-label="Pagination"
    >
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          className={`rounded px-3 py-1.5 ${p === page ? "bg-blue-700 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
