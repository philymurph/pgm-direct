import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteShippingMethodButton } from "@/components/admin/DeleteShippingMethodButton";

export default async function AdminShippingPage() {
  const methods = await prisma.shippingMethod.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Delivery methods</h1>
        <Link
          href="/admin/shipping/new"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add delivery method
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Prices customers see at checkout. Nothing here is hardcoded in the app —
        edit prices, free-delivery thresholds and availability below.
      </p>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Price</th>
            <th className="py-2">Free above</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link
                  href={`/admin/shipping/${m.id}/edit`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {m.name}
                </Link>
                {m.description && (
                  <span className="ml-2 text-xs text-slate-400">
                    {m.description}
                  </span>
                )}
              </td>
              <td className="py-2 text-slate-600">
                {m.isQuoteRequired
                  ? "Quote required"
                  : `€${Number(m.price).toFixed(2)}`}
              </td>
              <td className="py-2 text-slate-600">
                {m.freeAboveSubtotal
                  ? `€${Number(m.freeAboveSubtotal).toFixed(2)}`
                  : "—"}
              </td>
              <td className="py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${m.isActive ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}
                >
                  {m.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-2 text-right">
                <DeleteShippingMethodButton methodId={m.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
