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

      <section className="relative mx-auto max-w-7xl overflow-hidden px-4 py-14 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
        <div className="pointer-events-none absolute -left-20 top-10 -z-10 h-44 w-44 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 -z-10 h-36 w-36 rounded-full bg-cyan-200/40 blur-3xl" />

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Discover
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Shop by category
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Jump straight to the product families you use most, from precision
          agriculture to industrial enclosures and control systems.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-blue-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {cat.imageUrl ? (
                <div className="relative mb-5 h-16 w-16 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
                  <Image
                    src={cat.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 text-lg font-bold text-blue-700 shadow-sm">
                  {cat.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </div>
              )}

              <span className="relative z-10 text-2xl font-semibold leading-tight text-slate-900 transition-colors group-hover:text-blue-700">
                {cat.name}
              </span>
              <span className="relative z-10 mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors group-hover:text-slate-700">
                Explore category
                <span className="translate-x-0 transition-transform group-hover:translate-x-1">
                  →
                </span>
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
