import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteBrandButton } from "@/components/admin/DeleteBrandButton";

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Brands</h1>
        <Link
          href="/admin/brands/new"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add brand
        </Link>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Products</th>
            <th className="py-2">Featured</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {brands.map((b) => (
            <tr key={b.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link
                  href={`/admin/brands/${b.id}/edit`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {b.name}
                </Link>
              </td>
              <td className="py-2 text-slate-600">{b.slug}</td>
              <td className="py-2 text-slate-600">{b._count.products}</td>
              <td className="py-2 text-slate-600">
                {b.isFeatured ? "Yes" : "No"}
              </td>
              <td className="py-2 text-right">
                <DeleteBrandButton brandId={b.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
