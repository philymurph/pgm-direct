import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const addressSchema = z.object({
  label: z.string().trim().optional(),
  type: z.enum(["BILLING", "DELIVERY"]),
  contactName: z.string().trim().min(1),
  companyName: z.string().trim().optional(),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  county: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  country: z.string().trim().default("IE"),
  phone: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  guestEmail: z.string().trim().toLowerCase().email().optional(),
  purchaseReference: z.string().trim().optional(),
  shippingMethodId: z.string().min(1, "Please select a delivery method"),
  discountCode: z.string().trim().optional(),
  billing: z.object({
    contactName: z.string().trim().min(1),
    companyName: z.string().trim().optional(),
    vatNumber: z.string().trim().optional(),
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    county: z.string().trim().optional(),
    postcode: z.string().trim().optional(),
    country: z.string().trim().default("IE"),
    phone: z.string().trim().optional(),
  }),
  delivery: z.object({
    contactName: z.string().trim().min(1),
    companyName: z.string().trim().optional(),
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    county: z.string().trim().optional(),
    postcode: z.string().trim().optional(),
    country: z.string().trim().default("IE"),
    phone: z.string().trim().optional(),
  }),
  sameAsBilling: z.boolean().optional(),
});

export const contactSchema = z.object({
  type: z.enum([
    "GENERAL",
    "SALES",
    "TECHNICAL_SUPPORT",
    "TRADE_ACCOUNT",
    "ORDER_ENQUIRY",
  ]),
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  message: z.string().trim().min(10, "Please provide a few more details"),
  orderNumber: z.string().trim().optional(),
});

export const productAdminSchema = z.object({
  sku: z.string().trim().min(1),
  mpn: z.string().trim().optional(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().min(1),
  costPrice: z.coerce.number().min(0),
  sellingPriceExVat: z.coerce.number().min(0),
  vatRateId: z.string().min(1),
  weightKg: z.coerce.number().min(0).optional(),
  manufacturer: z.string().trim().optional(),
  allowBackorder: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  seoTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
});

export const categoryAdminSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().optional(),
  parentId: z.string().optional(),
  imageUrl: z.string().trim().optional(),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export const brandAdminSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  websiteUrl: z.string().trim().optional(),
  isFeatured: z.boolean().optional(),
});

export const shippingMethodAdminSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  price: z.coerce.number().min(0),
  freeAboveSubtotal: z.coerce.number().min(0).optional(),
  isQuoteRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().optional(),
});

export const vatRateAdminSchema = z.object({
  name: z.string().trim().min(1),
  ratePercent: z.coerce.number().min(0).max(100),
  isDefault: z.boolean().optional(),
});

export const discountAdminSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .transform((v) => v.toUpperCase()),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
});
