import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, categories] = await Promise.all([
    prisma.category.findUnique({ where: { id } }),
    prisma.category.findMany({
      where: { id: { not: id } },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!category) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
      <div className="mt-6">
        <CategoryForm
          categoryId={category.id}
          categories={categories}
          defaultValues={{
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parentId,
            imageUrl: category.imageUrl,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
          }}
        />
      </div>
    </div>
  );
}
