import { prisma } from "@/lib/db";
import {
  buildGoogleMerchantFeed,
  getMerchantAvailability,
  type GoogleMerchantFeedItem,
} from "@/lib/google-merchant";
import { calculateVat } from "@/lib/pricing";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

function toAbsoluteHttpUrl(value: string): string | null {
  try {
    const url = new URL(value, absoluteUrl("/"));
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true, images: { some: {} } },
    orderBy: { sku: "asc" },
    select: {
      sku: true,
      gtin: true,
      mpn: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      sellingPriceExVat: true,
      weightKg: true,
      manufacturer: true,
      allowBackorder: true,
      googleProductCategory: true,
      brand: { select: { name: true } },
      category: {
        select: { name: true, parent: { select: { name: true } } },
      },
      vatRate: { select: { ratePercent: true } },
      inventory: {
        select: {
          status: true,
          quantityOnHand: true,
          quantityReserved: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { url: true },
        take: 11,
      },
    },
  });

  const items = products.flatMap<GoogleMerchantFeedItem>((product) => {
    const imageLinks = product.images
      .map((image) => toAbsoluteHttpUrl(image.url))
      .filter((url): url is string => url !== null);
    const imageLink = imageLinks[0];
    if (!imageLink) return [];

    const price = calculateVat(
      product.sellingPriceExVat,
      product.vatRate.ratePercent,
    ).priceIncVat.toFixed(2);
    const brand = product.brand?.name ?? product.manufacturer ?? undefined;
    const productType = [product.category.parent?.name, product.category.name]
      .filter((name): name is string => Boolean(name))
      .join(" > ");

    return [
      {
        id: product.sku,
        title: normalizeText(product.name),
        description: normalizeText(
          product.shortDescription ?? product.description ?? product.name,
        ),
        link: new URL(
          `/products/${encodeURIComponent(product.slug)}`,
          absoluteUrl("/"),
        ).toString(),
        imageLink,
        additionalImageLinks: imageLinks.slice(1),
        availability: getMerchantAvailability(product),
        price: `${price} EUR`,
        brand,
        gtin: product.gtin ?? undefined,
        mpn: product.mpn ?? undefined,
        googleProductCategory: product.googleProductCategory ?? undefined,
        productType,
        shippingWeightKg: product.weightKg?.toString(),
      },
    ];
  });

  const xml = buildGoogleMerchantFeed({
    title: `${siteConfig.name} product feed`,
    description: siteConfig.description,
    link: absoluteUrl("/"),
    items,
  });

  return new Response(xml, {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      "Content-Disposition": 'inline; filename="google-merchant.xml"',
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
