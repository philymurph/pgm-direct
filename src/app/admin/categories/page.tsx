import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add category
        </Link>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Parent</th>
            <th className="py-2">Products</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link
                  href={`/admin/categories/${c.id}/edit`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {c.name}
                </Link>
              </td>
              <td className="py-2 text-slate-600">{c.slug}</td>
              <td className="py-2 text-slate-600">
                {categories.find((p) => p.id === c.parentId)?.name ?? "—"}
              </td>
              <td className="py-2 text-slate-600">{c._count.products}</td>
              <td className="py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${c.isActive ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-2 text-right">
                <DeleteCategoryButton categoryId={c.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
