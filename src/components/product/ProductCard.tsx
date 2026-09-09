import Link from "next/link";
import Image from "next/image";
import { calculateVat } from "@/lib/pricing";
import { PriceDisplay } from "./PriceDisplay";
import { StockBadge } from "./StockBadge";

interface ProductCardProduct {
  id: string;
  slug: string;
  name: string;
  sellingPriceExVat: unknown;
  brand: { name: string } | null;
  images: { url: string; altText: string | null }[];
  vatRate: { ratePercent: unknown };
  inventory?: { status: string } | null;
}

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const vat = calculateVat(
    product.sellingPriceExVat as never,
    product.vatRate.ratePercent as never,
  );
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded bg-slate-50">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            No image
          </div>
        )}
      </div>
      {product.brand && (
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {product.brand.name}
        </div>
      )}
      <h3 className="mb-1 line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-blue-700">
        {product.name}
      </h3>
      {product.inventory && (
        <div className="mb-2">
          <StockBadge status={product.inventory.status} />
        </div>
      )}
      <div className="mt-auto">
        <PriceDisplay
          priceExVat={vat.priceExVat}
          priceIncVat={vat.priceIncVat}
          vatRatePercent={vat.vatRatePercent}
        />
      </div>
    </Link>
  );
}
