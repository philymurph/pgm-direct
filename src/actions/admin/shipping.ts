"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { shippingMethodAdminSchema } from "@/lib/validation";

export interface ShippingMethodFormState {
  success: boolean;
  error?: string;
}

export async function upsertShippingMethodAction(
  methodId: string | null,
  _prev: ShippingMethodFormState,
  formData: FormData,
): Promise<ShippingMethodFormState> {
  await requireAdmin();

  const parsed = shippingMethodAdminSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    freeAboveSubtotal: formData.get("freeAboveSubtotal") || undefined,
    isQuoteRequired: formData.get("isQuoteRequired") === "on",
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Please check the delivery method details",
    };
  }

  if (methodId) {
    await prisma.shippingMethod.update({
      where: { id: methodId },
      data: parsed.data,
    });
  } else {
    await prisma.shippingMethod.create({ data: parsed.data });
  }

  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
  return { success: true };
}

export async function deleteShippingMethodAction(methodId: string) {
  await requireAdmin();
  await prisma.shippingMethod.delete({ where: { id: methodId } });
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
}
