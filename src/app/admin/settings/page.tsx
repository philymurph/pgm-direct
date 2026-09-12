import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { getSiteSettings } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { getProductionReadinessReport } from "@/lib/production-readiness";

export default async function AdminSettingsPage() {
  const [settings, vatRates, readiness] = await Promise.all([
    getSiteSettings(),
    prisma.vatRate.findMany({
      orderBy: { ratePercent: "asc" },
      select: { id: true, name: true, isDefault: true },
    }),
    getProductionReadinessReport(),
  ]);
  const defaultValues = {
    companyLegalName: settings.companyLegalName,
    tradingName: settings.tradingName,
    companyRegistrationNo: settings.companyRegistrationNo,
    vatNumber: settings.vatNumber,
    registeredAddress: settings.registeredAddress,
    phone: settings.phone,
    email: settings.email,
    defaultVatRateId:
      settings.defaultVatRateId ??
      vatRates.find((rate) => rate.isDefault)?.id ??
      null,
    pricesIncludeVatByDefaultDisplay: settings.pricesIncludeVatByDefaultDisplay,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <section className="mt-6 border-l-4 border-slate-300 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          {readiness.ready
            ? "Production checkout is configured"
            : "Production setup required"}
        </h2>
        {readiness.blockers.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {readiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
          {readiness.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </section>

      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Company and storefront
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        These details appear in the footer, contact page, and legal documents.
      </p>
      <SiteSettingsForm
        defaultValues={defaultValues}
        vatRates={vatRates.map(({ id, name }) => ({ id, name }))}
      />

      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Change password
      </h2>
      <div className="mt-3">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
