import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { getSiteSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Contact us</h1>
      <p className="mt-2 text-sm text-slate-600">
        Get in touch for general enquiries, sales, technical support, trade
        accounts or order enquiries.
      </p>

      {(settings.phone || settings.email) && (
        <div className="mt-4 space-y-1 text-sm text-slate-700">
          {settings.phone && <p>Phone: {settings.phone}</p>}
          {settings.email && <p>Email: {settings.email}</p>}
        </div>
      )}

      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
