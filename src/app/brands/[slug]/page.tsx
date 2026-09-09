import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrandBySlug, getAllProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { Pagination } from "@/components/catalog/Pagination";
import { SortSelect } from "@/components/catalog/SortSelect";
import { siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return {};
  return {
    title: brand.name,
    description:
      brand.description ?? `Shop ${brand.name} products at PGM Direct.`,
    alternates: { canonical: `${siteConfig.url}/brands/${brand.slug}` },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const { products, total, page, pageSize } = await getAllProducts({
    brandIds: [brand.id],
    sort: (sp.sort as never) ?? "relevance",
    page: sp.page ? Number(sp.page) : 1,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
      {brand.description && (
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          {brand.description}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {total} product{total === 1 ? "" : "s"}
        </p>
        <SortSelect />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        searchParams={sp}
      />
    </div>
  );
}
