"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

interface FilterOption {
  key: string;
  label: string;
  unit?: string | null;
  values: string[];
}

export function FilterSidebar({
  brands,
  specFilters,
}: {
  brands: { id: string; name: string }[];
  specFilters: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleMultiValue(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(key)?.split(",").filter(Boolean) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (next.length) params.set(key, next.join(","));
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectedBrands =
    searchParams.get("brand")?.split(",").filter(Boolean) ?? [];
  const inStockOnly = searchParams.get("inStock") === "1";

  return (
    <aside className="w-full space-y-6 lg:w-64 lg:shrink-0">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          Availability
        </h3>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) =>
              updateParam("inStock", e.target.checked ? "1" : null)
            }
          />
          In stock only
        </label>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          Price (ex. VAT)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => updateParam("minPrice", minPrice || null)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => updateParam("maxPrice", maxPrice || null)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Brand</h3>
          <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {brands.map((brand) => (
              <label
                key={brand.id}
                className="flex items-center gap-2 text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => toggleMultiValue("brand", brand.id)}
                />
                {brand.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {specFilters.map((filter) => {
        const selected =
          searchParams.get(`spec_${filter.key}`)?.split(",").filter(Boolean) ??
          [];
        return (
          <div key={filter.key}>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              {filter.label}
              {filter.unit ? ` (${filter.unit})` : ""}
            </h3>
            <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {filter.values.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(value)}
                    onChange={() =>
                      toggleMultiValue(`spec_${filter.key}`, value)
                    }
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
