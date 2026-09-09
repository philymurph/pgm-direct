import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteDiscountButton } from "@/components/admin/DeleteDiscountButton";

export default async function AdminDiscountsPage() {
  const discounts = await prisma.discount.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Discount codes</h1>
        <Link
          href="/admin/discounts/new"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add discount code
        </Link>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Code</th>
            <th className="py-2">Value</th>
            <th className="py-2">Used</th>
            <th className="py-2">Expires</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {discounts.map((d) => (
            <tr key={d.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link
                  href={`/admin/discounts/${d.id}/edit`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {d.code}
                </Link>
              </td>
              <td className="py-2 text-slate-600">
                {d.type === "PERCENTAGE"
                  ? `${Number(d.value)}%`
                  : `€${Number(d.value).toFixed(2)}`}
              </td>
              <td className="py-2 text-slate-600">
                {d.usedCount}
                {d.maxUses ? ` / ${d.maxUses}` : ""}
              </td>
              <td className="py-2 text-slate-600">
                {d.expiresAt ? d.expiresAt.toLocaleDateString("en-IE") : "—"}
              </td>
              <td className="py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${d.isActive ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}
                >
                  {d.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-2 text-right">
                <DeleteDiscountButton discountId={d.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
