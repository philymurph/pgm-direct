"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productAdminSchema } from "@/lib/validation";

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
    sku: formData.get("sku"),
    mpn: formData.get("mpn") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug"),
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
      const saved = productId
        ? await tx.product.update({ where: { id: productId }, data })
        : await tx.product.create({
            data: { ...data, inventory: { create: {} } },
          });

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
      error: "Could not save product — check the SKU and slug are unique",
    };
  }
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
