import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { brand: true, category: true, inventory: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add product
        </Link>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">SKU</th>
            <th className="py-2">Category</th>
            <th className="py-2">Price</th>
            <th className="py-2">Stock</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="py-2 pr-2">
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {p.name}
                </Link>
                {p.brand && (
                  <span className="ml-2 text-xs text-slate-400">
                    {p.brand.name}
                  </span>
                )}
              </td>
              <td className="py-2 text-slate-600">{p.sku}</td>
              <td className="py-2 text-slate-600">{p.category.name}</td>
              <td className="py-2 text-slate-600">
                €{Number(p.sellingPriceExVat).toFixed(2)}
              </td>
              <td className="py-2 text-slate-600">
                {p.inventory?.quantityOnHand ?? 0}
              </td>
              <td className="py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${p.isActive ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-2 text-right">
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="text-xs text-blue-700 hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
