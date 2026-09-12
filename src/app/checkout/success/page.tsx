import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  const { order: orderNumber, token } = await searchParams;
  const session = await getSession();

  const order = orderNumber
    ? await prisma.order.findUnique({
        where: { orderNumber },
        include: { items: true, shippingMethod: true },
      })
    : null;

  // Guest order numbers are semi-predictable, so only reveal full order
  // details to the customer who placed it; everyone else gets a generic thank-you.
  const canViewDetails =
    !!order &&
    (order.customerId
      ? order.customerId === session?.customerId
      : !!token && token === order.checkoutAccessToken);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Thank you for your order
      </h1>

      {!order || !canViewDetails ? (
        <p className="mt-4 text-sm text-slate-600">
          We&apos;re confirming your payment. Your confirmation email will
          contain the order details.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-600">
            Order <strong>{order.orderNumber}</strong> has been received.
            {order.status === "PENDING_PAYMENT"
              ? " We're confirming your payment now — this page will update shortly and a confirmation email will follow."
              : " A confirmation email will be sent shortly."}
          </p>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-left text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-600">Status</span>
              <span className="font-medium text-slate-900">
                {order.status.replaceAll("_", " ")}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
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
            <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3">
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
                <dt>Total paid</dt>
                <dd>€{Number(order.totalIncVat).toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}

      <Link
        href="/products"
        className="mt-8 inline-block text-sm font-semibold text-blue-700 hover:underline"
      >
        Continue shopping →
      </Link>
    </div>
  );
}
