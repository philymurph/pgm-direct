import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { getSiteSettings } from "@/lib/catalog";
import { PgmMark } from "./PgmMark";

export async function Footer() {
  const settings = await getSiteSettings();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <PgmMark className="h-6 w-6" />
            PGM<span className="text-blue-700">Direct</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{siteConfig.tagline}</p>
          <a
            href="https://pgmtechnologies.ie"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline"
          >
            Part of the PGM Technologies group →
          </a>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/products" className="hover:text-blue-700">
                All products
              </Link>
            </li>
            <li>
              <Link href="/enclosures" className="hover:text-blue-700">
                Enclosures
              </Link>
            </li>
            <li>
              <Link href="/brands" className="hover:text-blue-700">
                Brands
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Support</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/contact" className="hover:text-blue-700">
                Contact us
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="hover:text-blue-700">
                Track an order
              </Link>
            </li>
            <li>
              <Link href="/legal/returns" className="hover:text-blue-700">
                Returns policy
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="hover:text-blue-700">
                Terms &amp; conditions
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="hover:text-blue-700">
                Privacy policy
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Company</h3>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>{settings.tradingName}</li>
            {settings.registeredAddress && (
              <li>{settings.registeredAddress}</li>
            )}
            {settings.companyRegistrationNo && (
              <li>Company No. {settings.companyRegistrationNo}</li>
            )}
            {settings.vatNumber && <li>VAT No. {settings.vatNumber}</li>}
            {settings.phone && <li>{settings.phone}</li>}
            {settings.email && <li>{settings.email}</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        &copy; {new Date().getFullYear()} {settings.tradingName} is operated by{" "}
        {settings.companyLegalName}, part of the PGM Technologies group. All
        rights reserved.
      </div>
    </footer>
  );
}
