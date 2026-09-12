"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productAdminSchema } from "@/lib/validation";
import { slugify } from "@/lib/slugify";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

export interface ProductFormState {
  success: boolean;
  error?: string;
  productId?: string;
}

function parseLines(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function upsertProductAction(
  productId: string | null,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = productAdminSchema.safeParse({
    mpn: formData.get("mpn") || undefined,
    gtin: formData.get("gtin") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    shortDescription: formData.get("shortDescription") || undefined,
    brandId: formData.get("brandId") || undefined,
    categoryId: formData.get("categoryId"),
    costPrice: formData.get("costPrice"),
    sellingPriceExVat: formData.get("sellingPriceExVat"),
    vatRateId: formData.get("vatRateId"),
    weightKg: formData.get("weightKg") || undefined,
    manufacturer: formData.get("manufacturer") || undefined,
    allowBackorder: formData.get("allowBackorder") === "on",
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    isNew: formData.get("isNew") === "on",
    seoTitle: formData.get("seoTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    googleProductCategory: formData.get("googleProductCategory") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check the product details",
    };
  }

  // Specifications encoded as "label|key|value|unit" lines; images/documents as one URL per line.
  const specLines = parseLines(formData.get("specifications"));
  const specifications = specLines.map((line, i) => {
    const [label, key, value, unit] = line
      .split("|")
      .map((s) => s?.trim() ?? "");
    return {
      label: label || key,
      key: key || label.toLowerCase().replace(/\s+/g, "_"),
      value,
      unit: unit || null,
      sortOrder: i,
    };
  });

  const imageUrls = parseLines(formData.get("images"));
  const images = imageUrls.map((url, i) => ({
    url,
    sortOrder: i,
    isPrimary: i === 0,
  }));

  const docLines = parseLines(formData.get("documents"));
  const documents = docLines.map((line) => {
    const [title, url, type] = line.split("|").map((s) => s?.trim() ?? "");
    return { title: title || "Document", url, type: type || "DATASHEET" };
  });

  const data = { ...parsed.data };

  try {
    const product = await prisma.$transaction(async (tx) => {
      if (!productId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('pgm-direct-product-identifiers'))`;
      }

      const saved = productId
        ? await tx.product.update({ where: { id: productId }, data })
        : await createProductWithGeneratedIdentifiers(tx, data);

      await tx.productSpecification.deleteMany({
        where: { productId: saved.id },
      });
      if (specifications.length) {
        await tx.productSpecification.createMany({
          data: specifications.map((s) => ({ ...s, productId: saved.id })),
        });
      }

      await tx.productImage.deleteMany({ where: { productId: saved.id } });
      if (images.length) {
        await tx.productImage.createMany({
          data: images.map((img) => ({ ...img, productId: saved.id })),
        });
      }

      await tx.productDocument.deleteMany({ where: { productId: saved.id } });
      if (documents.length) {
        await tx.productDocument.createMany({
          data: documents.map((d) => ({ ...d, productId: saved.id })),
        });
      }

      return saved;
    });

    revalidatePath("/admin/products");
    revalidatePath(`/products/${product.slug}`);
    return { success: true, productId: product.id };
  } catch (error) {
    console.error("Failed to save product", error);
    return {
      success: false,
      error: "Could not save product — please check the product details",
    };
  }
}

async function createProductWithGeneratedIdentifiers(
  tx: Prisma.TransactionClient,
  data: z.infer<typeof productAdminSchema>,
) {
  const rows = await tx.$queryRaw<Array<{ nextSkuNumber: number }>>`
    SELECT COALESCE(MAX(
      CASE
        WHEN "sku" ~ '^PGM-[0-9]+$'
        THEN SUBSTRING("sku" FROM 5)::INTEGER
        ELSE 0
      END
    ), 0) + 1 AS "nextSkuNumber"
    FROM "Product"
  `;
  const nextSkuNumber = Number(rows[0]?.nextSkuNumber ?? 1);
  const sku = `PGM-${String(nextSkuNumber).padStart(5, "0")}`;

  const baseSlug = slugify(data.name) || `product-${nextSkuNumber}`;
  let slug = baseSlug;
  let suffix = 2;
  while (
    await tx.product.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return tx.product.create({
    data: { ...data, sku, slug, inventory: { create: {} } },
  });
}

export async function deleteProductAction(productId: string) {
  await requireAdmin();
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/admin/products");
}

export async function toggleProductActiveAction(productId: string) {
  await requireAdmin();
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { isActive: !product.isActive },
  });
  revalidatePath("/admin/products");
}

export async function adjustInventoryAction(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const quantityOnHand = Number(formData.get("quantityOnHand"));
  const lowStockThreshold = Number(formData.get("lowStockThreshold"));
  const allowBackorder = formData.get("allowBackorder") === "on";

  const status =
    quantityOnHand <= 0
      ? allowBackorder
        ? "AVAILABLE_TO_ORDER"
        : "OUT_OF_STOCK"
      : quantityOnHand <= lowStockThreshold
        ? "LOW_STOCK"
        : "IN_STOCK";

  await prisma.$transaction([
    prisma.inventory.upsert({
      where: { productId },
      create: { productId, quantityOnHand, lowStockThreshold, status },
      update: { quantityOnHand, lowStockThreshold, status },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { allowBackorder },
    }),
  ]);

  revalidatePath("/admin/products");
}
