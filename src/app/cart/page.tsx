import Link from "next/link";
import type { Metadata } from "next";
import { getCartSummary } from "@/lib/cart";
import { CartLineItem } from "@/components/cart/CartLineItem";

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false },
};

export default async function CartPage() {
  const cart = await getCartSummary();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Your cart</h1>

      {cart.lines.length === 0 ? (
        <div className="mt-8 rounded border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-500">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {cart.lines.map((line) => (
              <CartLineItem key={line.id} line={line} />
            ))}
          </div>

          <div className="h-fit rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Order summary
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal (ex. VAT)</dt>
                <dd>€{cart.subtotalExVat.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">VAT</dt>
                <dd>€{cart.vatTotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>€{cart.totalIncVat.toFixed(2)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-500">
              Delivery is calculated at checkout.
            </p>

            {cart.hasStockIssues ? (
              <p className="mt-4 text-xs font-medium text-red-600">
                Please resolve the stock issues above before checking out.
              </p>
            ) : (
              <Link
                href="/checkout"
                className="mt-4 block w-full rounded bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
              >
                Proceed to checkout
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
