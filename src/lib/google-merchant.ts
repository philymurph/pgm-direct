import { returnPolicyConfig } from "@/lib/site";

export type MerchantAvailability = "in_stock" | "out_of_stock" | "backorder";

export interface InventoryAvailabilityInput {
  allowBackorder: boolean;
  inventory: {
    status: string;
    quantityOnHand: number;
    quantityReserved: number;
  } | null;
}

export function getMerchantAvailability({
  allowBackorder,
  inventory,
}: InventoryAvailabilityInput): MerchantAvailability {
  if (!inventory) return allowBackorder ? "backorder" : "out_of_stock";
  if (
    inventory.status === "DISCONTINUED" ||
    inventory.status === "OUT_OF_STOCK"
  ) {
    return "out_of_stock";
  }
  if (inventory.status === "AVAILABLE_TO_ORDER") return "backorder";

  const available = inventory.quantityOnHand - inventory.quantityReserved;
  if (available > 0) return "in_stock";
  return allowBackorder ? "backorder" : "out_of_stock";
}

export function getSchemaAvailability(
  availability: MerchantAvailability,
): string {
  switch (availability) {
    case "in_stock":
      return "https://schema.org/InStock";
    case "backorder":
      return "https://schema.org/BackOrder";
    case "out_of_stock":
      return "https://schema.org/OutOfStock";
  }
}

export function getOfferMerchantReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: returnPolicyConfig.applicableCountry,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: returnPolicyConfig.consumerReturnDays,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  };
}

export function getOfferShippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "IE",
    },
  };
}

export interface GoogleMerchantFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  availability: MerchantAvailability;
  price: string;
  brand?: string;
  gtin?: string;
  mpn?: string;
  googleProductCategory?: string;
  productType?: string;
  shippingWeightKg?: string;
}

export interface GoogleMerchantFeedOptions {
  title: string;
  description: string;
  link: string;
  items: GoogleMerchantFeedItem[];
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function element(name: string, value: string, indentation: number): string {
  const indent = "  ".repeat(indentation);
  return `${indent}<${name}>${escapeXml(value)}</${name}>`;
}

function optionalElement(
  name: string,
  value: string | undefined,
  indentation: number,
): string | null {
  return value ? element(name, value, indentation) : null;
}

function serializeItem(item: GoogleMerchantFeedItem): string {
  const hasIdentifier = Boolean(item.brand || item.gtin || item.mpn);
  const elements = [
    element("g:id", item.id.slice(0, 50), 3),
    element("title", item.title.slice(0, 150), 3),
    element("description", item.description.slice(0, 5000), 3),
    element("link", item.link, 3),
    element("g:image_link", item.imageLink, 3),
    ...(item.additionalImageLinks ?? [])
      .slice(0, 10)
      .map((imageLink) => element("g:additional_image_link", imageLink, 3)),
    element("g:availability", item.availability, 3),
    element("g:price", item.price, 3),
    element("g:condition", "new", 3),
    optionalElement("g:brand", item.brand?.slice(0, 70), 3),
    optionalElement("g:gtin", item.gtin, 3),
    optionalElement("g:mpn", item.mpn?.slice(0, 70), 3),
    hasIdentifier ? null : element("g:identifier_exists", "no", 3),
    optionalElement(
      "g:google_product_category",
      item.googleProductCategory?.slice(0, 750),
      3,
    ),
    optionalElement("g:product_type", item.productType?.slice(0, 750), 3),
    optionalElement(
      "g:shipping_weight",
      item.shippingWeightKg ? `${item.shippingWeightKg} kg` : undefined,
      3,
    ),
    element("g:ships_from_country", "IE", 3),
  ].filter((value): value is string => value !== null);

  return ["    <item>", ...elements, "    </item>"].join("\n");
}

export function buildGoogleMerchantFeed({
  title,
  description,
  link,
  items,
}: GoogleMerchantFeedOptions): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    element("title", title, 2),
    element("link", link, 2),
    element("description", description, 2),
    ...items.map(serializeItem),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
