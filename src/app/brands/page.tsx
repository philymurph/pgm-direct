import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAllBrands } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Brands",
  description: "Manufacturers and brands stocked by PGM Direct.",
};

export default async function BrandsPage() {
  const brands = await getAllBrands();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Brands</h1>
      <p className="mt-2 text-sm text-slate-600">
        Manufacturers and brands we stock at PGM Direct.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-6 text-center transition hover:border-blue-300 hover:shadow-md"
          >
            {brand.logoUrl ? (
              <div className="relative h-10 w-full">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  sizes="160px"
                  className="object-contain"
                />
              </div>
            ) : (
              <span className="font-medium text-slate-900">{brand.name}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
