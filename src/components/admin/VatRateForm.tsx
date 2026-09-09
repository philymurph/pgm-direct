"use client";

import { useActionState } from "react";
import {
  upsertVatRateAction,
  type VatRateFormState,
} from "@/actions/admin/vat-rates";

const initialState: VatRateFormState = { success: false };

export function VatRateForm({
  vatRateId,
  defaultValues,
}: {
  vatRateId: string | null;
  defaultValues?: { name: string; ratePercent: number; isDefault: boolean };
}) {
  const action = upsertVatRateAction.bind(null, vatRateId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          name="name"
          required
          placeholder="e.g. Standard 23%"
          defaultValue={defaultValues?.name}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Rate (%)
        </label>
        <input
          name="ratePercent"
          type="number"
          step="0.01"
          min="0"
          max="100"
          required
          defaultValue={defaultValues?.ratePercent}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={defaultValues?.isDefault}
        />
        Default rate (used for delivery and new products unless overridden)
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save VAT rate"}
      </button>
    </form>
  );
}
