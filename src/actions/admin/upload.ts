"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

export interface UploadedImage {
  url: string;
  name: string;
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<
  { success: true; image: UploadedImage } | { success: false; error: string }
> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: `Unsupported file type: ${file.type}` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "Image must be smaller than 8MB" };
  }

  const productIdValue = formData.get("productId");
  const productId =
    typeof productIdValue === "string" && productIdValue.trim()
      ? productIdValue.trim()
      : null;
  let uploadedUrl: string | null = null;

  try {
    const blob = await put(
      `products/${crypto.randomUUID()}-${file.name}`,
      file,
      {
        access: "public",
        addRandomSuffix: false,
      },
    );
    uploadedUrl = blob.url;

    if (productId) {
      const product = await prisma.$transaction(async (tx) => {
        const existingProduct = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, slug: true },
        });
        if (!existingProduct) throw new Error("Product not found");

        const [imageCount, lastImage] = await Promise.all([
          tx.productImage.count({ where: { productId } }),
          tx.productImage.findFirst({
            where: { productId },
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true },
          }),
        ]);
        await tx.productImage.create({
          data: {
            productId,
            url: blob.url,
            altText: file.name,
            sortOrder: (lastImage?.sortOrder ?? -1) + 1,
            isPrimary: imageCount === 0,
          },
        });
        return existingProduct;
      });

      revalidatePath("/admin/products");
      revalidatePath(`/admin/products/${product.id}/edit`);
      revalidatePath(`/products/${product.slug}`);
    }

    return { success: true, image: { url: blob.url, name: file.name } };
  } catch (error) {
    console.error("Failed to upload product image", error);
    if (uploadedUrl) await del(uploadedUrl).catch(() => undefined);
    return { success: false, error: "Upload failed — please try again" };
  }
}

export async function deleteProductImageAction(url: string): Promise<void> {
  await requireAdmin();

  const linkedImages = await prisma.productImage.findMany({
    where: { url },
    select: { product: { select: { id: true, slug: true } } },
  });
  await prisma.productImage.deleteMany({ where: { url } });

  try {
    const hostname = new URL(url).hostname;
    if (hostname.endsWith(".blob.vercel-storage.com")) await del(url);
  } catch (error) {
    console.error("Failed to delete blob", error);
  }

  for (const { product } of linkedImages) {
    const firstRemaining = await prisma.productImage.findFirst({
      where: { productId: product.id },
      orderBy: { sortOrder: "asc" },
    });
    if (firstRemaining) {
      await prisma.productImage.updateMany({
        where: { productId: product.id },
        data: { isPrimary: false },
      });
      await prisma.productImage.update({
        where: { id: firstRemaining.id },
        data: { isPrimary: true },
      });
    }
    revalidatePath(`/admin/products/${product.id}/edit`);
    revalidatePath(`/products/${product.slug}`);
  }
  revalidatePath("/admin/products");
}
