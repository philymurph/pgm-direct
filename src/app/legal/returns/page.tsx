import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Returns Policy" };

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Returns Policy</h1>
      <p className="mt-2 text-sm text-slate-500">
        This is a general draft template — please have it reviewed by a
        solicitor before relying on it.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-slate-700">
        <h2>Right to cancel</h2>
        <p>
          As a consumer buying online from {siteConfig.name}, you have the
          right to cancel your order within 14 days of receiving your goods,
          without giving any reason, under the EU Consumer Rights Directive.
        </p>

        <h2>How to return an item</h2>
        <p>
          Contact us via our <Link href="/contact">contact page</Link> with your
          order number to request a return. Items must be returned unused,
          in their original packaging, within 14 days of your cancellation
          request.
        </p>

        <h2>Refunds</h2>
        <p>
          Once we receive and inspect the returned item, we will issue a
          refund to your original payment method within 14 days.
        </p>

        <h2>Faulty or damaged goods</h2>
        <p>
          If an item arrives faulty or damaged, contact us as soon as
          possible with photos and your order number — we&apos;ll arrange a
          replacement or refund at no cost to you.
        </p>

        <h2>Trade / business orders</h2>
        <p>
          Custom or bulk orders placed on a purchase order basis may be
          subject to different return terms, agreed at the time of order.
        </p>
      </div>
    </div>
  );
}
