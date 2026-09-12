"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { siteSettingsAdminSchema } from "@/lib/validation";

export interface SiteSettingsFormState {
  success: boolean;
  error?: string;
}

export async function updateSiteSettingsAction(
  _previousState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  await requireAdmin();

  const optionalValue = (name: string) =>
    String(formData.get(name) ?? "").trim() || undefined;
  const parsed = siteSettingsAdminSchema.safeParse({
    companyLegalName: formData.get("companyLegalName"),
    tradingName: formData.get("tradingName"),
    companyRegistrationNo: optionalValue("companyRegistrationNo"),
    vatNumber: optionalValue("vatNumber"),
    registeredAddress: optionalValue("registeredAddress"),
    phone: optionalValue("phone"),
    email: optionalValue("email"),
    defaultVatRateId: optionalValue("defaultVatRateId"),
    pricesIncludeVatByDefaultDisplay:
      formData.get("pricesIncludeVatByDefaultDisplay") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check the company details",
    };
  }

  if (parsed.data.defaultVatRateId) {
    const vatRate = await prisma.vatRate.findUnique({
      where: { id: parsed.data.defaultVatRateId },
      select: { id: true },
    });
    if (!vatRate) return { success: false, error: "Select a valid VAT rate" };
  }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.defaultVatRateId) {
      await tx.vatRate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      await tx.vatRate.update({
        where: { id: parsed.data.defaultVatRateId },
        data: { isDefault: true },
      });
    }

    await tx.siteSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        ...parsed.data,
        companyRegistrationNo: parsed.data.companyRegistrationNo ?? null,
        vatNumber: parsed.data.vatNumber ?? null,
        registeredAddress: parsed.data.registeredAddress ?? null,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        defaultVatRateId: parsed.data.defaultVatRateId ?? null,
      },
      update: {
        ...parsed.data,
        companyRegistrationNo: parsed.data.companyRegistrationNo ?? null,
        vatNumber: parsed.data.vatNumber ?? null,
        registeredAddress: parsed.data.registeredAddress ?? null,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        defaultVatRateId: parsed.data.defaultVatRateId ?? null,
      },
    });
  });

  for (const path of [
    "/",
    "/admin/settings",
    "/contact",
    "/legal/privacy",
    "/legal/returns",
    "/legal/terms",
  ]) {
    revalidatePath(path);
  }
  return { success: true };
}
