import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default async function TermsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-slate-500">
        This is a general draft template — please have it reviewed by a
        solicitor before relying on it.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-slate-700">
        <h2>1. Who we are</h2>
        <p>
          {siteConfig.name} is operated by {settings.companyLegalName}
          {settings.companyRegistrationNo
            ? ` (company no. ${settings.companyRegistrationNo})`
            : ""}
          {settings.registeredAddress ? `, ${settings.registeredAddress}` : ""}
          . These terms apply to all orders placed through {siteConfig.domain}.
        </p>

        <h2>2. Orders and pricing</h2>
        <p>
          All prices are shown in euro (€) and, unless stated otherwise,
          include Irish VAT at the applicable rate. We reserve the right to
          correct pricing or description errors and to cancel an order
          affected by such an error, in which case you will receive a full
          refund.
        </p>

        <h2>3. Payment</h2>
        <p>
          Payments are processed securely by Revolut. We do not store your
          card details on our servers.
        </p>

        <h2>4. Delivery</h2>
        <p>
          Delivery costs and estimated timeframes are shown at checkout
          before you complete your order. Risk in the goods passes to you on
          delivery.
        </p>

        <h2>5. Returns and cancellation</h2>
        <p>
          See our <Link href="/legal/returns">Returns Policy</Link> for full
          details of your right to cancel and return goods.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          Nothing in these terms limits or excludes liability that cannot
          lawfully be limited or excluded under Irish law, including for
          death or personal injury caused by negligence, or fraud.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about these terms can be sent via our{" "}
          <Link href="/contact">contact page</Link>
          {settings.email ? ` or to ${settings.email}` : ""}.
        </p>
      </div>
    </div>
  );
}
