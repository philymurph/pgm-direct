import { z } from "zod";

const commonEmailDomainCorrections = new Map([
  ["gmail.con", "gmail.com"],
  ["gmial.com", "gmail.com"],
  ["gmai.com", "gmail.com"],
  ["hotmail.con", "hotmail.com"],
  ["outlook.con", "outlook.com"],
  ["icloud.con", "icloud.com"],
  ["yahoo.con", "yahoo.com"],
]);

export const customerEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .superRefine((email, context) => {
    const domain = email.split("@").at(-1);
    const correction = domain
      ? commonEmailDomainCorrections.get(domain)
      : undefined;
    if (!correction) return;

    context.addIssue({
      code: "custom",
      message: `Check your email address. Did you mean ${email.slice(0, email.lastIndexOf("@") + 1)}${correction}?`,
    });
  });

export const registerSchema = z.object({
  email: customerEmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: customerEmailSchema,
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
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

export const checkoutSchema = z
  .object({
    guestEmail: customerEmailSchema.optional(),
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
  })
  .superRefine((checkout, context) => {
    const deliveryCountry = checkout.sameAsBilling
      ? checkout.billing.country
      : checkout.delivery.country;
    if (deliveryCountry === "IE") return;

    context.addIssue({
      code: "custom",
      path: [checkout.sameAsBilling ? "billing" : "delivery", "country"],
      message:
        "Delivery is currently available only within the Republic of Ireland",
    });
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
  email: customerEmailSchema,
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
  orderNumber: z.string().trim().optional(),
});

export const siteSettingsAdminSchema = z.object({
  companyLegalName: z.string().trim().min(1, "Enter the legal company name"),
  tradingName: z.string().trim().min(1, "Enter the trading name"),
  companyRegistrationNo: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  registeredAddress: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address").optional(),
  defaultVatRateId: z.string().trim().optional(),
  pricesIncludeVatByDefaultDisplay: z.boolean(),
});

export const gtinSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/,
        "Enter a valid 8, 12, 13, or 14 digit GTIN",
      )
      .refine((value) => {
        const digits = [...value].map(Number);
        const checkDigit = digits.pop();
        const sum = digits
          .reverse()
          .reduce(
            (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
            0,
          );

        return (10 - (sum % 10)) % 10 === checkDigit;
      }, "Enter a GTIN with a valid check digit"),
  );

export const productAdminSchema = z.object({
  mpn: z.string().trim().optional(),
  gtin: gtinSchema.optional(),
  name: z.string().trim().min(1),
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
  googleProductCategory: z.string().trim().max(750).optional(),
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
