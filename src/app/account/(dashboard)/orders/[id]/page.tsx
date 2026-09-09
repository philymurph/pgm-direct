import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ReorderButton } from "@/components/account/ReorderButton";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const order = await prisma.order.findFirst({
    where: { id, customerId: session?.customerId },
    include: { items: true, shippingMethod: true, payments: true },
  });
  if (!order) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {order.orderNumber}
        </h1>
        <ReorderButton orderId={order.id} />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Placed {order.createdAt.toLocaleDateString("en-IE")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold text-slate-900">Status</h2>
          <p>Fulfilment: {order.status.replaceAll("_", " ")}</p>
          <p>Payment: {order.paymentStatus.replaceAll("_", " ")}</p>
          {order.trackingNumber && (
            <p className="mt-1">
              Tracking: {order.trackingCarrier} — {order.trackingNumber}
            </p>
          )}
        </div>
        <div className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold text-slate-900">
            Delivery address
          </h2>
          <p>{order.deliveryContactName}</p>
          <p>{order.deliveryLine1}</p>
          {order.deliveryLine2 && <p>{order.deliveryLine2}</p>}
          <p>
            {order.deliveryCity}
            {order.deliveryCounty ? `, ${order.deliveryCounty}` : ""}
          </p>
          {order.deliveryPostcode && <p>{order.deliveryPostcode}</p>}
        </div>
      </div>

      <div className="mt-6 rounded border border-slate-200 bg-white p-4">
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
            <dt className="text-slate-600">
              Delivery ({order.shippingMethod?.name})
            </dt>
            <dd>€{Number(order.shippingExVat).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <dt>Total</dt>
            <dd>€{Number(order.totalIncVat).toFixed(2)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
