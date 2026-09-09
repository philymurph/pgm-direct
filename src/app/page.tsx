import Link from "next/link";
import Image from "next/image";
import { getHomepageData } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";
import { ProductCard } from "@/components/product/ProductCard";

export default async function HomePage() {
  const {
    categories,
    featuredProducts,
    newProducts,
    popularProducts,
    featuredBrands,
  } = await getHomepageData();

  return (
    <div>
      <section className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            {siteConfig.tagline}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            {siteConfig.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="rounded bg-blue-700 px-6 py-3 text-sm font-semibold hover:bg-blue-600"
            >
              Shop Products
            </Link>
            <Link
              href="/categories"
              className="rounded border border-slate-500 px-6 py-3 text-sm font-semibold hover:border-white"
            >
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          Shop by category
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${cat.slug}`}
              className="group flex flex-col items-start rounded-lg border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md"
            >
              {cat.imageUrl ? (
                <div className="relative mb-3 h-12 w-12">
                  <Image
                    src={cat.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="mb-3 h-12 w-12 rounded bg-blue-50" />
              )}
              <span className="font-medium text-slate-900 group-hover:text-blue-700">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <ProductSection title="Featured products" products={featuredProducts} />
      )}

      {newProducts.length > 0 && (
        <ProductSection title="New products" products={newProducts} />
      )}

      {popularProducts.length > 0 && (
        <ProductSection title="Popular products" products={popularProducts} />
      )}

      {featuredBrands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900">
            Featured brands
          </h2>
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
            {featuredBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="flex items-center justify-center rounded border border-slate-200 bg-white p-4 grayscale transition hover:grayscale-0"
              >
                {brand.logoUrl ? (
                  <div className="relative h-10 w-full">
                    <Image
                      src={brand.logoUrl}
                      alt={brand.name}
                      fill
                      sizes="160px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium text-slate-700">
                    {brand.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProductSection({
  title,
  products,
}: {
  title: string;
  products: Parameters<typeof ProductCard>[0]["product"][];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="mb-6 text-xl font-bold text-slate-900">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
