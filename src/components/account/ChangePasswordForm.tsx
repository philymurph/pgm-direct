"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type ChangePasswordFormState,
} from "@/actions/account";

const initialState: ChangePasswordFormState = { success: false };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Password updated.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Current password
        </label>
        <input
          type="password"
          name="currentPassword"
          required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
