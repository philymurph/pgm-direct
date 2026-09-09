"use server";

import { put, del } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";

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
): Promise<{ success: true; image: UploadedImage } | { success: false; error: string }> {
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

  try {
    const blob = await put(`products/${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return { success: true, image: { url: blob.url, name: file.name } };
  } catch (error) {
    console.error("Failed to upload product image", error);
    return { success: false, error: "Upload failed — please try again" };
  }
}

export async function deleteProductImageAction(url: string): Promise<void> {
  await requireAdmin();
  try {
    await del(url);
  } catch (error) {
    console.error("Failed to delete blob", error);
  }
}
