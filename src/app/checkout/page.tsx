import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCartSummary } from "@/lib/cart";
import { getActiveShippingMethods } from "@/lib/catalog";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const [cart, shippingMethods, session] = await Promise.all([
    getCartSummary(),
    getActiveShippingMethods(),
    getSession(),
  ]);

  if (cart.lines.length === 0) redirect("/cart");
  if (cart.hasStockIssues) redirect("/cart");

  let guestEmailDefault: string | undefined;
  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    guestEmailDefault = user?.email;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
      <p className="mt-2 text-sm text-slate-600">
        Delivery is currently available only within the Republic of Ireland.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm
            shippingMethods={shippingMethods.map((m) => ({
              id: m.id,
              name: m.name,
              description: m.description,
              price: Number(m.price),
              isQuoteRequired: m.isQuoteRequired,
            }))}
            guestEmailDefault={guestEmailDefault}
            isLoggedIn={!!session}
          />
        </div>

        <div className="h-fit rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Order summary
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2">
                <span className="text-slate-600">
                  {line.productName} × {line.quantity}
                </span>
                <span className="shrink-0 font-medium text-slate-900">
                  €{line.lineTotalIncVat.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal (ex. VAT)</dt>
              <dd>€{cart.subtotalExVat.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">VAT</dt>
              <dd>€{cart.vatTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold text-slate-900">
              <dt>Total</dt>
              <dd>€{cart.totalIncVat.toFixed(2)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Final total including delivery is confirmed after you choose a
            delivery method.
          </p>
        </div>
      </div>
    </div>
  );
}
