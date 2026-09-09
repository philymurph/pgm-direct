import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: true,
      addresses: true,
      orders: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        {customer.firstName} {customer.lastName}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {customer.user.email}
        {customer.phone ? ` · ${customer.phone}` : ""}
      </p>

      {customer.companyName && (
        <p className="mt-2 text-sm text-slate-600">
          {customer.companyName}
          {customer.vatNumber ? ` · VAT ${customer.vatNumber}` : ""}
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Order history
      </h2>
      {customer.orders.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No orders yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {customer.orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <Link
                href={`/admin/orders/${order.id}`}
                className="font-medium text-blue-700 hover:underline"
              >
                {order.orderNumber}
              </Link>
              <span className="text-slate-500">
                €{Number(order.totalIncVat).toFixed(2)} ·{" "}
                {order.status.replaceAll("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-900">Addresses</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {customer.addresses.map((address) => (
          <div
            key={address.id}
            className="rounded border border-slate-200 bg-white p-4 text-sm"
          >
            <p className="font-medium text-slate-900">
              {address.label || address.type}
            </p>
            <p>{address.contactName}</p>
            <p>{address.line1}</p>
            <p>{address.city}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
