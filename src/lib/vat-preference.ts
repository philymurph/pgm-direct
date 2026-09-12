import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";

export type VatDisplayMode = "inc" | "ex";

export async function getVatDisplayMode(): Promise<VatDisplayMode> {
  const cookieStore = await cookies();
  const preference = cookieStore.get("pgm_vat_display")?.value;
  if (preference === "inc" || preference === "ex") return preference;
  return getDefaultVatDisplayMode();
}

const getDefaultVatDisplayMode = cache(async (): Promise<VatDisplayMode> => {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { pricesIncludeVatByDefaultDisplay: true },
  });
  return settings?.pricesIncludeVatByDefaultDisplay === false ? "ex" : "inc";
});
