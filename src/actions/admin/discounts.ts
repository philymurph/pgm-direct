"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { discountAdminSchema } from "@/lib/validation";

export interface DiscountFormState {
  success: boolean;
  error?: string;
}

export async function upsertDiscountAction(
  discountId: string | null,
  _prev: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  await requireAdmin();

  const parsed = discountAdminSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minOrderValue: formData.get("minOrderValue") || undefined,
    maxUses: formData.get("maxUses") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check the discount details",
    };
  }

  const data = {
    ...parsed.data,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  };

  try {
    if (discountId) {
      await prisma.discount.update({ where: { id: discountId }, data });
    } else {
      await prisma.discount.create({ data });
    }
    revalidatePath("/admin/discounts");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Could not save discount — check the code is unique",
    };
  }
}

export async function deleteDiscountAction(discountId: string) {
  await requireAdmin();
  await prisma.discount.delete({ where: { id: discountId } });
  revalidatePath("/admin/discounts");
}
