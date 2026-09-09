"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { categoryAdminSchema } from "@/lib/validation";

export interface CategoryFormState {
  success: boolean;
  error?: string;
}

export async function upsertCategoryAction(
  categoryId: string | null,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const parsed = categoryAdminSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    parentId: formData.get("parentId") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    sortOrder: formData.get("sortOrder") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check the category details",
    };
  }

  try {
    if (categoryId) {
      await prisma.category.update({
        where: { id: categoryId },
        data: parsed.data,
      });
    } else {
      await prisma.category.create({ data: parsed.data });
    }
    revalidatePath("/admin/categories");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Could not save category — check the slug is unique",
    };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  await requireAdmin();
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin/categories");
}

export async function reorderCategoryAction(
  categoryId: string,
  sortOrder: number,
) {
  await requireAdmin();
  await prisma.category.update({
    where: { id: categoryId },
    data: { sortOrder },
  });
  revalidatePath("/admin/categories");
}
