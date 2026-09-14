import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getAccessoriesForProduct } from "@/lib/catalog";
import { calculateVat } from "@/lib/pricing";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SpecTable } from "@/components/product/SpecTable";
import { DownloadsList } from "@/components/product/DownloadsList";
import { StockBadge } from "@/components/product/StockBadge";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { FavouriteButton } from "@/components/product/FavouriteButton";
import { ProductCard } from "@/components/product/ProductCard";
import { siteConfig } from "@/lib/site";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getMerchantAvailability,
  getOfferMerchantReturnPolicy,
  getSchemaAvailability,
} from "@/lib/google-merchant";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title =
    product.seoTitle ??
    `${product.name} | ${product.mpn ?? product.sku} | ${siteConfig.name}`;
  const description =
    product.metaDescription ?? product.shortDescription ?? undefined;

  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `${siteConfig.url}/products/${product.slug}` },
    openGraph: {
      title,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const vat = calculateVat(
    product.sellingPriceExVat,
    product.vatRate.ratePercent,
  );
  const available =
    (product.inventory?.quantityOnHand ?? 0) -
    (product.inventory?.quantityReserved ?? 0);
  const merchantAvailability = getMerchantAvailability(product);
  const displayStockStatus =
    product.inventory?.status === "DISCONTINUED"
      ? "DISCONTINUED"
      : merchantAvailability === "in_stock"
        ? product.inventory?.status === "LOW_STOCK"
          ? "LOW_STOCK"
          : "IN_STOCK"
        : merchantAvailability === "backorder"
          ? "AVAILABLE_TO_ORDER"
          : "OUT_OF_STOCK";
  const accessories = await getAccessoriesForProduct(product.id);
  const session = await getSession();
  const isFavourited = session?.customerId
    ? !!(await prisma.favouriteProduct.findUnique({
        where: {
          customerId_productId: {
            customerId: session.customerId,
            productId: product.id,
          },
        },
      }))
    : false;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    mpn: product.mpn ?? undefined,
    gtin: product.gtin ?? undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map((image) =>
      new URL(image.url, `${siteConfig.url}/`).toString(),
    ),
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: vat.priceIncVat.toString(),
      availability: getSchemaAvailability(merchantAvailability),
      itemCondition: "https://schema.org/NewCondition",
      url: `${siteConfig.url}/products/${product.slug}`,
      hasMerchantReturnPolicy: getOfferMerchantReturnPolicy(),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: `${siteConfig.url}/${product.category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteConfig.url}/products/${product.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-700">
          Home
        </Link>
        {" / "}
        <Link
          href={`/${product.category.slug}`}
          className="hover:text-blue-700"
        >
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          {product.brand && (
            <div className="text-sm font-medium uppercase tracking-wide text-blue-700">
              {product.brand.name}
            </div>
          )}
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {product.name}
          </h1>

          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
            <div>
              <dt className="inline font-medium">PGM SKU:</dt>{" "}
              <dd className="inline">{product.sku}</dd>
            </div>
            {product.mpn && (
              <div>
                <dt className="inline font-medium">MPN:</dt>{" "}
                <dd className="inline">{product.mpn}</dd>
              </div>
            )}
            {product.manufacturer && (
              <div>
                <dt className="inline font-medium">Manufacturer:</dt>{" "}
                <dd className="inline">{product.manufacturer}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4">
            <PriceDisplay
              priceExVat={vat.priceExVat}
              priceIncVat={vat.priceIncVat}
              vatRatePercent={vat.vatRatePercent}
              size="lg"
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <StockBadge status={displayStockStatus} />
            {product.inventory && !product.allowBackorder && available > 0 && (
              <span className="text-xs text-slate-500">
                {available} available
              </span>
            )}
          </div>

          <div className="mt-6 max-w-xs">
            <AddToCartButton
              productId={product.id}
              maxQuantity={product.allowBackorder ? null : available}
            />
          </div>

          <div className="mt-3">
            <FavouriteButton
              productId={product.id}
              initiallyFavourited={isFavourited}
              isLoggedIn={!!session}
            />
          </div>

          {product.shortDescription && (
            <p className="mt-6 text-sm leading-6 text-slate-700">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Delivery</p>
            <p className="mt-1">
              Dispatched from our Irish depot. We currently deliver only within
              the Republic of Ireland. Options and costs are calculated at
              checkout.
            </p>
          </div>

          {product.documents.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Downloads
              </h2>
              <DownloadsList documents={product.documents} />
            </div>
          )}
        </div>
      </div>

      {product.description && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            Technical description
          </h2>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
            {product.description}
          </p>
        </section>
      )}

      {product.specifications.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            Specifications
          </h2>
          <SpecTable specs={product.specifications} />
        </section>
      )}

      {accessories.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Compatible accessories
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {accessories.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {product.relatedTo.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Related products
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {product.relatedTo.map((rel) => (
              <ProductCard key={rel.related.id} product={rel.related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
