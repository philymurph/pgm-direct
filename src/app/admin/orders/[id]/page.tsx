import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OrderAdminControls } from "@/components/admin/OrderAdminControls";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      shippingMethod: true,
      customer: { include: { user: true } },
    },
  });
  if (!order) notFound();

  const canRefund = order.payments.some((p) => p.status === "PAID");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {order.customer?.user.email ?? order.guestEmail ?? "Guest"} ·{" "}
        {order.createdAt.toLocaleString("en-IE")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Items</h2>
            <ul className="space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span className="text-slate-600">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium text-slate-900">
                    €{Number(item.lineTotalIncVat).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal (ex. VAT)</dt>
                <dd>€{Number(order.subtotalExVat).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">VAT</dt>
                <dd>€{Number(order.vatTotal).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Delivery</dt>
                <dd>€{Number(order.shippingExVat).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>€{Number(order.totalIncVat).toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border border-slate-200 bg-white p-4 text-sm">
              <h2 className="mb-2 font-semibold text-slate-900">
                Billing address
              </h2>
              <p>{order.billingContactName}</p>
              {order.billingCompanyName && <p>{order.billingCompanyName}</p>}
              {order.billingVatNumber && <p>VAT: {order.billingVatNumber}</p>}
              <p>{order.billingLine1}</p>
              <p>
                {order.billingCity}
                {order.billingCounty ? `, ${order.billingCounty}` : ""}
              </p>
              {order.billingPostcode && <p>{order.billingPostcode}</p>}
            </div>
            <div className="rounded border border-slate-200 bg-white p-4 text-sm">
              <h2 className="mb-2 font-semibold text-slate-900">
                Delivery address
              </h2>
              <p>{order.deliveryContactName}</p>
              <p>{order.deliveryLine1}</p>
              <p>
                {order.deliveryCity}
                {order.deliveryCounty ? `, ${order.deliveryCounty}` : ""}
              </p>
              {order.deliveryPostcode && <p>{order.deliveryPostcode}</p>}
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-4 text-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Payments</h2>
            <ul className="space-y-1">
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span className="text-slate-600">
                    {p.provider} · {p.providerOrderId}
                  </span>
                  <span className="font-medium text-slate-900">
                    €{Number(p.amount).toFixed(2)} · {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Status: {order.status.replaceAll("_", " ")} / {order.paymentStatus}
          </h2>
          <OrderAdminControls orderId={order.id} canRefund={canRefund} />
        </div>
      </div>
    </div>
  );
}
