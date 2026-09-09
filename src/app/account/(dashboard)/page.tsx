import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function AccountDashboardPage() {
  const session = await getSession();
  const customer = session?.customerId
    ? await prisma.customer.findUnique({
        where: { id: session.customerId },
        include: { user: true },
      })
    : null;

  const recentOrders = session?.customerId
    ? await prisma.order.findMany({
        where: { customerId: session.customerId },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome{customer ? `, ${customer.firstName}` : ""}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{customer?.user.email}</p>

      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Recent orders
      </h2>
      {recentOrders.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          You haven&apos;t placed any orders yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {recentOrders.map((order) => (
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
      <Link
        href="/account/orders"
        className="mt-3 inline-block text-sm text-blue-700 hover:underline"
      >
        View all orders →
      </Link>
    </div>
  );
}
