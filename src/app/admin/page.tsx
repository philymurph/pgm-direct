import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    todayOrders,
    awaitingProcessing,
    lowStockProducts,
    recentCustomers,
    recentPayments,
    revenueAgg,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.inventory.findMany({
      where: { status: "LOW_STOCK" },
      include: { product: true },
      take: 10,
    }),
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { order: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfToday }, paymentStatus: "PAID" },
      _sum: { totalIncVat: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Today's orders" value={todayOrders} />
        <StatCard
          label="Today's revenue"
          value={`€${Number(revenueAgg._sum.totalIncVat ?? 0).toFixed(2)}`}
        />
        <StatCard label="Awaiting processing" value={awaitingProcessing} />
        <StatCard label="Low stock items" value={lowStockProducts.length} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Low stock products
          </h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No low stock alerts.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lowStockProducts.map((inv) => (
                <li key={inv.id} className="flex justify-between">
                  <Link
                    href={`/admin/products/${inv.productId}/edit`}
                    className="text-blue-700 hover:underline"
                  >
                    {inv.product?.name}
                  </Link>
                  <span className="text-slate-500">
                    {inv.quantityOnHand} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Recent payments
          </h2>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <Link
                    href={`/admin/orders/${p.orderId}`}
                    className="text-blue-700 hover:underline"
                  >
                    {p.order.orderNumber}
                  </Link>
                  <span className="text-slate-500">
                    €{Number(p.amount).toFixed(2)} · {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Recent customers
          </h2>
          {recentCustomers.length === 0 ? (
            <p className="text-sm text-slate-500">No customers yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentCustomers.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {c.firstName} {c.lastName}
                  </Link>
                  <span className="text-slate-500">{c.user.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
