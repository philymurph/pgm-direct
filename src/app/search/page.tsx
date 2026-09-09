import type { Metadata } from "next";
import { searchProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";

export const metadata: Metadata = {
  title: "Search results",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const products = q.trim() ? await searchProducts(q, 60) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Search results for &ldquo;{q}&rdquo;
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {products.length} result{products.length === 1 ? "" : "s"}
      </p>

      {products.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No products matched your search. Try a different product name, SKU or
          manufacturer part number.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
