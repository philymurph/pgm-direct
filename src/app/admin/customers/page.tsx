import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    include: { user: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Customers</h1>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Orders</th>
            <th className="py-2">Trade account</th>
            <th className="py-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {c.firstName} {c.lastName}
                </Link>
              </td>
              <td className="py-2 text-slate-600">{c.user.email}</td>
              <td className="py-2 text-slate-600">{c._count.orders}</td>
              <td className="py-2 text-slate-600">
                {c.isTradeAccount ? "Yes" : "No"}
              </td>
              <td className="py-2 text-slate-600">
                {c.createdAt.toLocaleDateString("en-IE")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
