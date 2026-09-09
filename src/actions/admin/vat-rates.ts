"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { vatRateAdminSchema } from "@/lib/validation";

export interface VatRateFormState {
  success: boolean;
  error?: string;
}

export async function upsertVatRateAction(
  vatRateId: string | null,
  _prev: VatRateFormState,
  formData: FormData,
): Promise<VatRateFormState> {
  await requireAdmin();

  const parsed = vatRateAdminSchema.safeParse({
    name: formData.get("name"),
    ratePercent: formData.get("ratePercent"),
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check the VAT rate details",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Only one VAT rate can be the default at a time.
      if (parsed.data.isDefault) {
        await tx.vatRate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      if (vatRateId) {
        await tx.vatRate.update({
          where: { id: vatRateId },
          data: parsed.data,
        });
      } else {
        await tx.vatRate.create({ data: parsed.data });
      }
    });

    revalidatePath("/admin/vat-rates");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Could not save VAT rate — check the name is unique",
    };
  }
}

export async function deleteVatRateAction(vatRateId: string) {
  await requireAdmin();
  const inUse = await prisma.product.count({ where: { vatRateId } });
  if (inUse > 0)
    throw new Error(`Cannot delete — ${inUse} product(s) use this VAT rate`);
  await prisma.vatRate.delete({ where: { id: vatRateId } });
  revalidatePath("/admin/vat-rates");
}
