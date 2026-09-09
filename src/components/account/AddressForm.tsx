"use client";

import { useActionState } from "react";
import { saveAddressAction, type AddressFormState } from "@/actions/account";

const initialState: AddressFormState = { success: false };

export function AddressForm() {
  const [state, formAction, isPending] = useActionState(
    saveAddressAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-4 space-y-3 rounded border border-slate-200 bg-white p-4"
    >
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <select
          name="type"
          required
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="BILLING">Billing</option>
          <option value="DELIVERY">Delivery</option>
        </select>
        <input
          name="label"
          placeholder="Label (e.g. Home)"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        name="contactName"
        placeholder="Full name"
        required
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="companyName"
        placeholder="Company (optional)"
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="line1"
        placeholder="Address line 1"
        required
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="line2"
        placeholder="Address line 2"
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="city"
          placeholder="Town / City"
          required
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="county"
          placeholder="County"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="postcode"
          placeholder="Eircode / Postcode"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="phone"
          placeholder="Phone"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}
