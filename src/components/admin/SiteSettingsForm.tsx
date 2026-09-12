"use client";

import { useActionState } from "react";
import {
  updateSiteSettingsAction,
  type SiteSettingsFormState,
} from "@/actions/admin/settings";

const initialState: SiteSettingsFormState = { success: false };

interface SettingsValues {
  companyLegalName: string;
  tradingName: string;
  companyRegistrationNo: string | null;
  vatNumber: string | null;
  registeredAddress: string | null;
  phone: string | null;
  email: string | null;
  defaultVatRateId: string | null;
  pricesIncludeVatByDefaultDisplay: boolean;
}

export function SiteSettingsForm({
  defaultValues,
  vatRates,
}: {
  defaultValues: SettingsValues;
  vatRates: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSiteSettingsAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 max-w-2xl space-y-5">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Company settings saved.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="companyLegalName"
          label="Legal company name"
          required
          defaultValue={defaultValues.companyLegalName}
        />
        <TextField
          name="tradingName"
          label="Trading name"
          required
          defaultValue={defaultValues.tradingName}
        />
        <TextField
          name="companyRegistrationNo"
          label="Company registration number"
          defaultValue={defaultValues.companyRegistrationNo}
        />
        <TextField
          name="vatNumber"
          label="VAT number"
          defaultValue={defaultValues.vatNumber}
        />
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={defaultValues.phone}
        />
        <TextField
          name="email"
          label="Public contact email"
          type="email"
          defaultValue={defaultValues.email}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Registered address
        </label>
        <textarea
          name="registeredAddress"
          rows={3}
          defaultValue={defaultValues.registeredAddress ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Default VAT rate
        </label>
        <select
          name="defaultVatRateId"
          defaultValue={defaultValues.defaultVatRateId ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select a rate</option>
          {vatRates.map((rate) => (
            <option key={rate.id} value={rate.id}>
              {rate.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="pricesIncludeVatByDefaultDisplay"
          defaultChecked={defaultValues.pricesIncludeVatByDefaultDisplay}
        />
        Show VAT-inclusive prices by default
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save company settings"}
      </button>
    </form>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
