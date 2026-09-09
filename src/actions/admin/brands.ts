"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brandAdminSchema } from "@/lib/validation";

export interface BrandFormState {
  success: boolean;
  error?: string;
}

export async function upsertBrandAction(
  brandId: string | null,
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  await requireAdmin();

  const parsed = brandAdminSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    websiteUrl: formData.get("websiteUrl") || undefined,
    isFeatured: formData.get("isFeatured") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check the brand details",
    };
  }

  try {
    if (brandId) {
      await prisma.brand.update({ where: { id: brandId }, data: parsed.data });
    } else {
      await prisma.brand.create({ data: parsed.data });
    }
    revalidatePath("/admin/brands");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Could not save brand — check the slug is unique",
    };
  }
}

export async function deleteBrandAction(brandId: string) {
  await requireAdmin();
  await prisma.brand.delete({ where: { id: brandId } });
  revalidatePath("/admin/brands");
}
