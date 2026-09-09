import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const [categories, brands, vatRates] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.vatRate.findMany({ orderBy: { ratePercent: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add product</h1>
      <div className="mt-6">
        <ProductForm
          productId={null}
          categories={categories}
          brands={brands}
          vatRates={vatRates.map((v) => ({ id: v.id, name: v.name }))}
        />
      </div>
    </div>
  );
}
