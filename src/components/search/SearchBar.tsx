"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  sku: string;
  mpn: string | null;
  brand: string | null;
  image: string | null;
  priceIncVat: number;
}

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale results when the query is cleared
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // aborted or network error — ignore
      }
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="site-search" className="sr-only">
          Search products by name, SKU, manufacturer part number or brand
        </label>
        <div className="flex items-center rounded-md border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
          <input
            id="site-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search by product, SKU, MPN or brand…"
            className={`w-full bg-transparent px-3 outline-none placeholder:text-slate-400 ${compact ? "py-1.5 text-sm" : "py-2.5"}`}
            autoComplete="off"
          />
          <button
            type="submit"
            className="mr-1 shrink-0 rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Search
          </button>
        </div>
      </form>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/products/${r.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image}
                    alt=""
                    className="h-full w-full rounded object-cover"
                  />
                ) : (
                  "IMG"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">
                  {r.name}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {r.brand ? `${r.brand} · ` : ""}
                  {r.sku}
                  {r.mpn ? ` · ${r.mpn}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold text-slate-900">
                €{r.priceIncVat.toFixed(2)}
              </div>
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-center text-sm font-medium text-blue-700 hover:bg-slate-50"
          >
            View all results
          </Link>
        </div>
      )}
    </div>
  );
}
