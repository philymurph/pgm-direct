"use client";

import { useActionState } from "react";
import { upsertBrandAction, type BrandFormState } from "@/actions/admin/brands";

const initialState: BrandFormState = { success: false };

export function BrandForm({
  brandId,
  defaultValues,
}: {
  brandId: string | null;
  defaultValues?: {
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    isFeatured: boolean;
  };
}) {
  const action = upsertBrandAction.bind(null, brandId);
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
        <label className="block text-sm font-medium text-slate-700">Slug</label>
        <input
          name="slug"
          required
          defaultValue={defaultValues?.slug}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Logo URL
        </label>
        <input
          name="logoUrl"
          defaultValue={defaultValues?.logoUrl ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Website URL
        </label>
        <input
          name="websiteUrl"
          defaultValue={defaultValues?.websiteUrl ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={defaultValues?.isFeatured}
        />
        Featured on homepage
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save brand"}
      </button>
    </form>
  );
}
