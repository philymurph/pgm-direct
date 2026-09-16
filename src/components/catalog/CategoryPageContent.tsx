import Link from "next/link";
import {
  getProductsForCategory,
  getDistinctSpecValues,
  type CategoryProductFilters,
} from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterSidebar } from "./FilterSidebar";
import { SortSelect } from "./SortSelect";
import { Pagination } from "./Pagination";
import { absoluteUrl } from "@/lib/site";

type CategoryWithNav = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent: { name: string; slug: string } | null;
  children: { id: string; name: string; slug: string }[];
  filterAttributes: { key: string; label: string; unit: string | null }[];
};

export async function CategoryPageContent({
  category,
  searchParams,
}: {
  category: CategoryWithNav;
  searchParams: Record<string, string | undefined>;
}) {
  const filters: CategoryProductFilters = {
    brandIds: searchParams.brand?.split(",").filter(Boolean),
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    inStockOnly: searchParams.inStock === "1",
    sort: (searchParams.sort as CategoryProductFilters["sort"]) ?? "relevance",
    page: searchParams.page ? Number(searchParams.page) : 1,
    specs: Object.fromEntries(
      category.filterAttributes
        .map(
          (f) =>
            [
              f.key,
              searchParams[`spec_${f.key}`]?.split(",").filter(Boolean) ?? [],
            ] as const,
        )
        .filter(([, values]) => values.length > 0),
    ),
  };

  const { products, total, page, pageSize, brands, categoryIds } =
    await getProductsForCategory(category.id, filters);

  const specFilters = await Promise.all(
    category.filterAttributes.map(async (f) => ({
      key: f.key,
      label: f.label,
      unit: f.unit,
      values: await getDistinctSpecValues(categoryIds, f.key),
    })),
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      ...(category.parent
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: category.parent.name,
              item: absoluteUrl(`/${category.parent.slug}`),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: category.parent ? 3 : 2,
        name: category.name,
        item: absoluteUrl(`/${category.parent ? `${category.parent.slug}/` : ""}${category.slug}`),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-700">
          Home
        </Link>
        {category.parent && (
          <>
            {" / "}
            <Link
              href={`/${category.parent.slug}`}
              className="hover:text-blue-700"
            >
              {category.parent.name}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-slate-700">{category.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          {category.description}
        </p>
      )}

      {category.children.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/${category.slug}/${child.slug}`}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-blue-400 hover:text-blue-700"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <FilterSidebar brands={brands} specFilters={specFilters} />

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
            searchParams={searchParams}
          />
        </div>
      </div>
    </div>
  );
}
