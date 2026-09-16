const DEFAULT_PROD_URL = "https://pgmdirect.ie";

function normalizeSiteUrl(rawUrl?: string): string {
  const fallback =
    process.env.NODE_ENV === "production" ? DEFAULT_PROD_URL : "http://localhost:3000";
  const value = rawUrl?.trim();
  if (!value) return fallback;

  try {
    const parsed = new URL(value);
    if (
      process.env.NODE_ENV === "production" &&
      parsed.hostname !== "localhost" &&
      parsed.protocol !== "https:"
    ) {
      parsed.protocol = "https:";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

export const siteConfig = {
  name: "PGM Direct",
  legalName: "PGM Technologies Ltd",
  tagline: "Technology. Components. Solutions.",
  domain: "pgmdirect.ie",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  description:
    "PGM Direct is an Irish supplier of technical enclosures and specialist components. We currently supply the Bopla enclosure range, with further product categories launching soon.",
};

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${siteConfig.url}/`).toString();
}

export const returnPolicyConfig = {
  applicableCountry: "IE",
  returnCountry: "IE",
  consumerReturnDays: 14,
} as const;
