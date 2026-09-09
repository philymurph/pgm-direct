import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const orders = await prisma.order.findMany({
    where: {
      status: status ? (status as never) : undefined,
      orderNumber: q ? { contains: q, mode: "insensitive" } : undefined,
    },
    include: { customer: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statuses = [
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "COMPLETED",
    "CANCELLED",
    "PAYMENT_FAILED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Orders</h1>

      <form className="mt-4 flex flex-wrap gap-3 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search order number…"
          className="rounded border border-slate-300 px-3 py-1.5"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded border border-slate-300 px-3 py-1.5"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-slate-800 px-4 py-1.5 text-white"
        >
          Filter
        </button>
      </form>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Order</th>
            <th className="py-2">Customer</th>
            <th className="py-2">Total</th>
            <th className="py-2">Status</th>
            <th className="py-2">Payment</th>
            <th className="py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-slate-100">
              <td className="py-2">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </td>
              <td className="py-2 text-slate-600">
                {order.customer?.user.email ?? order.guestEmail ?? "Guest"}
              </td>
              <td className="py-2 text-slate-600">
                €{Number(order.totalIncVat).toFixed(2)}
              </td>
              <td className="py-2 text-slate-600">
                {order.status.replaceAll("_", " ")}
              </td>
              <td className="py-2 text-slate-600">{order.paymentStatus}</td>
              <td className="py-2 text-slate-600">
                {order.createdAt.toLocaleDateString("en-IE")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
