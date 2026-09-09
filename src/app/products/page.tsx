import type { Metadata } from "next";
import { getAllProducts, type CategoryProductFilters } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterSidebar } from "@/components/catalog/FilterSidebar";
import { SortSelect } from "@/components/catalog/SortSelect";
import { Pagination } from "@/components/catalog/Pagination";

export const metadata: Metadata = {
  title: "All Products",
  description:
    "Browse the PGM Direct catalogue — currently featuring the Bopla enclosure range, with more technical product categories launching soon.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const filters: CategoryProductFilters = {
    brandIds: sp.brand?.split(",").filter(Boolean),
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    inStockOnly: sp.inStock === "1",
    sort: (sp.sort as CategoryProductFilters["sort"]) ?? "relevance",
    page: sp.page ? Number(sp.page) : 1,
  };

  const { products, total, page, pageSize, brands } =
    await getAllProducts(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">All products</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        We currently supply the Bopla enclosure range, shipped from our Irish
        depot. Further product categories are launching soon.
      </p>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <FilterSidebar brands={brands} specFilters={[]} />

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {total} product{total === 1 ? "" : "s"}
            </p>
            <SortSelect />
          </div>

          {products.length === 0 ? (
            <p className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No products match these filters yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            searchParams={sp}
          />
        </div>
      </div>
    </div>
  );
}
