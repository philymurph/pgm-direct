import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function OrdersPage() {
  const session = await getSession();
  const orders = session?.customerId
    ? await prisma.order.findMany({
        where: { customerId: session.customerId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your orders</h1>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          You haven&apos;t placed any orders yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {order.orderNumber}
                </Link>
                <p className="text-xs text-slate-500">
                  {order.createdAt.toLocaleDateString("en-IE")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-900">
                  €{Number(order.totalIncVat).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">
                  {order.status.replaceAll("_", " ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
