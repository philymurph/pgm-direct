import "server-only";
import { cookies } from "next/headers";

export type VatDisplayMode = "inc" | "ex";

export async function getVatDisplayMode(): Promise<VatDisplayMode> {
  const cookieStore = await cookies();
  return cookieStore.get("pgm_vat_display")?.value === "ex" ? "ex" : "inc";
}
