"use client";

import { useActionState } from "react";
import {
  upsertCategoryAction,
  type CategoryFormState,
} from "@/actions/admin/categories";

const initialState: CategoryFormState = { success: false };

export function CategoryForm({
  categoryId,
  categories,
  defaultValues,
}: {
  categoryId: string | null;
  categories: { id: string; name: string }[];
  defaultValues?: {
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
  };
}) {
  const action = upsertCategoryAction.bind(null, categoryId);
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
          Parent category
        </label>
        <select
          name="parentId"
          defaultValue={defaultValues?.parentId ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">None (top-level)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
          Image URL
        </label>
        <input
          name="imageUrl"
          defaultValue={defaultValues?.imageUrl ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
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
        {isPending ? "Saving…" : "Save category"}
      </button>
    </form>
  );
}
