import "server-only";
import { prisma } from "./db";

export interface ProductionReadinessReport {
  ready: boolean;
  blockers: string[];
  warnings: string[];
}

export async function getProductionReadinessReport(): Promise<ProductionReadinessReport> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const requiredEnvironmentVariables = [
    "REVOLUT_PUBLIC_KEY",
    "REVOLUT_SECRET_KEY",
    "REVOLUT_WEBHOOK_SECRET",
    "EMAIL_FROM",
    "EMAIL_SERVER_HOST",
    "EMAIL_SERVER_PORT",
    "EMAIL_SERVER_USER",
    "EMAIL_SERVER_PASSWORD",
    "CRON_SECRET",
  ];
  for (const name of requiredEnvironmentVariables) {
    if (!process.env[name]?.trim()) blockers.push(`Set ${name}`);
  }

  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret || authSecret.length < 32 || authSecret.includes("replace")) {
    blockers.push(
      "Set AUTH_SECRET to a unique value of at least 32 characters",
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    if (!siteUrl || new URL(siteUrl).protocol !== "https:") {
      blockers.push("Set NEXT_PUBLIC_SITE_URL to the final HTTPS domain");
    }
  } catch {
    blockers.push("Set NEXT_PUBLIC_SITE_URL to a valid HTTPS URL");
  }

  if (process.env.REVOLUT_ENVIRONMENT !== "production") {
    blockers.push(
      "Set REVOLUT_ENVIRONMENT to production after sandbox testing",
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    warnings.push("Set BLOB_READ_WRITE_TOKEN to upload product images");
  }
  const redisUrl =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const redisToken =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!redisUrl || !redisToken) {
    blockers.push("Connect an Upstash Redis database for shared rate limiting");
  }

  const [settings, activeProducts, sellableShippingMethods, defaultVatRate] =
    await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.shippingMethod.count({
        where: { isActive: true, isQuoteRequired: false },
      }),
      prisma.vatRate.findFirst({ where: { isDefault: true } }),
    ]);

  if (!settings) {
    blockers.push("Save company details in Admin > Settings");
  } else {
    const requiredCompanyFields: Array<[string | null, string]> = [
      [settings.companyRegistrationNo, "company registration number"],
      [settings.vatNumber, "VAT number"],
      [settings.registeredAddress, "registered address"],
      [settings.email, "public contact email"],
    ];
    for (const [value, label] of requiredCompanyFields) {
      if (!value?.trim()) blockers.push(`Add the ${label} in Admin > Settings`);
    }
  }

  if (activeProducts === 0) blockers.push("Add at least one active product");
  if (sellableShippingMethods === 0) {
    blockers.push(
      "Add at least one active delivery method that does not require a quote",
    );
  }
  if (!defaultVatRate) blockers.push("Select a default VAT rate");

  const placeholderProducts = await prisma.product.count({
    where: {
      isActive: true,
      OR: [
        { images: { none: {} } },
        { images: { some: { url: { contains: "placeholder" } } } },
        { documents: { some: { url: { contains: "example.com" } } } },
      ],
    },
  });
  if (placeholderProducts > 0) {
    blockers.push(
      `Replace placeholder images or documents on ${placeholderProducts} active product(s)`,
    );
  }

  warnings.push(
    "Have the terms, privacy, and returns policies reviewed before launch",
  );
  return { ready: blockers.length === 0, blockers, warnings };
}
