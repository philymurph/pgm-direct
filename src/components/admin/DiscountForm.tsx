"use client";

import { useActionState } from "react";
import {
  upsertDiscountAction,
  type DiscountFormState,
} from "@/actions/admin/discounts";

const initialState: DiscountFormState = { success: false };

export function DiscountForm({
  discountId,
  defaultValues,
}: {
  discountId: string | null;
  defaultValues?: {
    code: string;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    minOrderValue: number | null;
    maxUses: number | null;
    startsAt: string | null;
    expiresAt: string | null;
    isActive: boolean;
  };
}) {
  const action = upsertDiscountAction.bind(null, discountId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Code</label>
        <input
          name="code"
          required
          placeholder="e.g. WELCOME10"
          defaultValue={defaultValues?.code}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Type
          </label>
          <select
            name="type"
            defaultValue={defaultValues?.type ?? "PERCENTAGE"}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED_AMOUNT">Fixed amount off</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Value
          </label>
          <input
            name="value"
            type="number"
            step="0.01"
            required
            defaultValue={defaultValues?.value}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Minimum order (€, optional)
          </label>
          <input
            name="minOrderValue"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.minOrderValue ?? undefined}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Max uses (optional)
          </label>
          <input
            name="maxUses"
            type="number"
            min="1"
            defaultValue={defaultValues?.maxUses ?? undefined}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Starts at (optional)
          </label>
          <input
            name="startsAt"
            type="date"
            defaultValue={defaultValues?.startsAt ?? undefined}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Expires at (optional)
          </label>
          <input
            name="expiresAt"
            type="date"
            defaultValue={defaultValues?.expiresAt ?? undefined}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

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
        {isPending ? "Saving…" : "Save discount"}
      </button>
    </form>
  );
}
