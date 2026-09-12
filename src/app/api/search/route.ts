import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { toNumber } from "@/lib/money";
import { calculateVat } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const { allowed } = await rateLimit(`search:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const query = req.nextUrl.searchParams.get("q")?.slice(0, 100) ?? "";
  const products = await searchProducts(query, 10);

  const results = products.map((p) => {
    const vat = calculateVat(p.sellingPriceExVat, p.vatRate.ratePercent);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      mpn: p.mpn,
      brand: p.brand?.name ?? null,
      image: p.images[0]?.url ?? null,
      priceExVat: toNumber(vat.priceExVat),
      priceIncVat: toNumber(vat.priceIncVat),
    };
  });

  return NextResponse.json({ results });
}
