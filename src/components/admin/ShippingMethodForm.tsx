"use client";

import { useActionState } from "react";
import {
  upsertShippingMethodAction,
  type ShippingMethodFormState,
} from "@/actions/admin/shipping";

const initialState: ShippingMethodFormState = { success: false };

export function ShippingMethodForm({
  methodId,
  defaultValues,
}: {
  methodId: string | null;
  defaultValues?: {
    name: string;
    description: string | null;
    price: number;
    freeAboveSubtotal: number | null;
    isQuoteRequired: boolean;
    isActive: boolean;
    sortOrder: number;
  };
}) {
  const action = upsertShippingMethodAction.bind(null, methodId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
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
          defaultValue={defaultValues?.name}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <input
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Price (€, ex. VAT)
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            required
            defaultValue={defaultValues?.price}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Free above order (€, optional)
          </label>
          <input
            name="freeAboveSubtotal"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.freeAboveSubtotal ?? undefined}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Sort order
        </label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={defaultValues?.sortOrder ?? 0}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isQuoteRequired"
          defaultChecked={defaultValues?.isQuoteRequired}
        />
        Requires a manual quote (customers cannot select this at checkout)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
        />
        Active
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save delivery method"}
      </button>
    </form>
  );
}
