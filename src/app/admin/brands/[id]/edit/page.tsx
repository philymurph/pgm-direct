import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BrandForm } from "@/components/admin/BrandForm";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
      <div className="mt-6">
        <BrandForm
          brandId={brand.id}
          defaultValues={{
            name: brand.name,
            slug: brand.slug,
            description: brand.description,
            logoUrl: brand.logoUrl,
            websiteUrl: brand.websiteUrl,
            isFeatured: brand.isFeatured,
          }}
        />
      </div>
    </div>
  );
}
