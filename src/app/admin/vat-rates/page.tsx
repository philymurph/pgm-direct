import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteVatRateButton } from "@/components/admin/DeleteVatRateButton";

export default async function AdminVatRatesPage() {
  const vatRates = await prisma.vatRate.findMany({
    orderBy: { ratePercent: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">VAT rates</h1>
        <Link
          href="/admin/vat-rates/new"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add VAT rate
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        VAT is configured here, not hardcoded — every product references one of
        these rates.
      </p>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Rate</th>
            <th className="py-2">Products</th>
            <th className="py-2">Default</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {vatRates.map((v) => (
            <tr key={v.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link
                  href={`/admin/vat-rates/${v.id}/edit`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {v.name}
                </Link>
              </td>
              <td className="py-2 text-slate-600">{Number(v.ratePercent)}%</td>
              <td className="py-2 text-slate-600">{v._count.products}</td>
              <td className="py-2 text-slate-600">
                {v.isDefault ? "Yes" : "No"}
              </td>
              <td className="py-2">
                <DeleteVatRateButton vatRateId={v.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
