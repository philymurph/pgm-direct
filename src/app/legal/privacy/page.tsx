import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">
        This is a general draft template — please have it reviewed by a
        solicitor before relying on it.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-slate-700">
        <h2>1. Who we are</h2>
        <p>
          {siteConfig.name} is operated by {settings.companyLegalName}. This
          policy explains what personal data we collect when you use{" "}
          {siteConfig.domain} and how we use it, in line with the GDPR.
        </p>

        <h2>2. What we collect</h2>
        <ul>
          <li>
            Account details: name, email address, phone number, delivery and
            billing addresses.
          </li>
          <li>
            Order details: items purchased, order value, and order history.
          </li>
          <li>
            Payment information: processed directly by Revolut — we never
            see or store your full card details.
          </li>
          <li>
            Contact form submissions: name, email, phone and the content of
            your message.
          </li>
          <li>
            Technical data: IP address and basic usage data, used for
            security (e.g. rate limiting) and site functionality.
          </li>
        </ul>

        <h2>3. Why we use it</h2>
        <p>
          To process and deliver your orders, provide customer support,
          maintain your account, and comply with tax and accounting
          obligations. We do not sell your personal data.
        </p>

        <h2>4. How long we keep it</h2>
        <p>
          Order records are retained as required for tax and accounting
          purposes. Account data is retained while your account is active,
          or until you ask us to delete it.
        </p>

        <h2>5. Your rights</h2>
        <p>
          You can request access to, correction of, or deletion of your
          personal data at any time by contacting us
          {settings.email ? ` at ${settings.email}` : " via our contact page"}
          . You also have the right to lodge a complaint with the Irish Data
          Protection Commission (dataprotection.ie).
        </p>

        <h2>6. Cookies</h2>
        <p>
          We use strictly necessary cookies to keep you signed in and to
          remember your cart and VAT display preference. We do not use
          third-party advertising cookies.
        </p>
      </div>
    </div>
  );
}
