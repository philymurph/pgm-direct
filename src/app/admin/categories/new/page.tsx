import { prisma } from "@/lib/db";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function NewCategoryPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add category</h1>
      <div className="mt-6">
        <CategoryForm categoryId={null} categories={categories} />
      </div>
    </div>
  );
}
