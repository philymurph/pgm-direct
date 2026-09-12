import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/admin/ProductForm";
import { InventoryForm } from "@/components/admin/InventoryForm";
import { ProductActions } from "@/components/admin/ProductActions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories, brands, vatRates] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        specifications: true,
        images: true,
        documents: true,
        inventory: true,
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.vatRate.findMany({ orderBy: { ratePercent: "asc" } }),
  ]);

  if (!product) notFound();

  const defaultValues = {
    mpn: product.mpn,
    gtin: product.gtin,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    brandId: product.brandId,
    categoryId: product.categoryId,
    costPrice: Number(product.costPrice),
    sellingPriceExVat: Number(product.sellingPriceExVat),
    vatRateId: product.vatRateId,
    weightKg: product.weightKg ? Number(product.weightKg) : null,
    manufacturer: product.manufacturer,
    allowBackorder: product.allowBackorder,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    seoTitle: product.seoTitle,
    metaDescription: product.metaDescription,
    googleProductCategory: product.googleProductCategory,
    specifications: product.specifications
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => `${s.label}|${s.key}|${s.value}|${s.unit ?? ""}`)
      .join("\n"),
    images: product.images
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => i.url)
      .join("\n"),
    documents: product.documents
      .map((d) => `${d.title}|${d.url}|${d.type}`)
      .join("\n"),
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
        <ProductActions productId={product.id} isActive={product.isActive} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductForm
            productId={product.id}
            categories={categories}
            brands={brands}
            vatRates={vatRates.map((v) => ({ id: v.id, name: v.name }))}
            defaultValues={defaultValues}
          />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Stock</h2>
          <InventoryForm
            productId={product.id}
            quantityOnHand={product.inventory?.quantityOnHand ?? 0}
            lowStockThreshold={product.inventory?.lowStockThreshold ?? 5}
            allowBackorder={product.allowBackorder}
          />
        </div>
      </div>
    </div>
  );
}
