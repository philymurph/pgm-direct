"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactFormState } from "@/actions/contact";

const initialState: ContactFormState = { success: false };

const typeOptions = [
  { value: "GENERAL", label: "General enquiry" },
  { value: "SALES", label: "Sales" },
  { value: "ORDER_ENQUIRY", label: "Order enquiry" },
];

export function ContactForm({
  defaultType = "GENERAL",
}: {
  defaultType?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    submitContactAction,
    initialState,
  );

  if (state.success) {
    return (
      <p className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Thanks — your message has been sent. We&apos;ll be in touch shortly.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Enquiry type
        </label>
        <select
          name="type"
          defaultValue={defaultType}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Phone (optional)
          </label>
          <input
            name="phone"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Company (optional)
          </label>
          <input
            name="company"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Order number (optional)
        </label>
        <input
          name="orderNumber"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          name="message"
          required
          rows={5}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
