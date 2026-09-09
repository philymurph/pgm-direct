"use client";

import { useActionState } from "react";
import {
  upsertProductAction,
  type ProductFormState,
} from "@/actions/admin/products";
import { ImageUploader } from "@/components/admin/ImageUploader";

const initialState: ProductFormState = { success: false };

interface ProductFormProps {
  productId: string | null;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  vatRates: { id: string; name: string }[];
  defaultValues?: {
    sku: string;
    mpn: string | null;
    name: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    brandId: string | null;
    categoryId: string;
    costPrice: number;
    sellingPriceExVat: number;
    vatRateId: string;
    weightKg: number | null;
    manufacturer: string | null;
    allowBackorder: boolean;
    isActive: boolean;
    isFeatured: boolean;
    isNew: boolean;
    seoTitle: string | null;
    metaDescription: string | null;
    specifications: string;
    images: string;
    documents: string;
  };
}

export function ProductForm({
  productId,
  categories,
  brands,
  vatRates,
  defaultValues,
}: ProductFormProps) {
  const action = upsertProductAction.bind(null, productId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="SKU"
          name="sku"
          defaultValue={defaultValues?.sku}
          required
        />
        <Field
          label="Manufacturer part number"
          name="mpn"
          defaultValue={defaultValues?.mpn ?? ""}
        />
      </div>

      <Field
        label="Product name"
        name="name"
        defaultValue={defaultValues?.name}
        required
      />
      <Field
        label="Slug"
        name="slug"
        defaultValue={defaultValues?.slug}
        required
      />

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Short description
        </label>
        <input
          name="shortDescription"
          defaultValue={defaultValues?.shortDescription ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            name="categoryId"
            required
            defaultValue={defaultValues?.categoryId}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Brand
          </label>
          <select
            name="brandId"
            defaultValue={defaultValues?.brandId ?? ""}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field
          label="Cost price (€)"
          name="costPrice"
          type="number"
          step="0.01"
          defaultValue={defaultValues?.costPrice}
          required
        />
        <Field
          label="Selling price ex. VAT (€)"
          name="sellingPriceExVat"
          type="number"
          step="0.01"
          defaultValue={defaultValues?.sellingPriceExVat}
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700">
            VAT rate
          </label>
          <select
            name="vatRateId"
            required
            defaultValue={defaultValues?.vatRateId}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {vatRates.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Weight (kg)"
          name="weightKg"
          type="number"
          step="0.001"
          defaultValue={defaultValues?.weightKg ?? undefined}
        />
        <Field
          label="Manufacturer"
          name="manufacturer"
          defaultValue={defaultValues?.manufacturer ?? ""}
        />
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-slate-700">
        <Checkbox
          label="Allow backorder"
          name="allowBackorder"
          defaultChecked={defaultValues?.allowBackorder}
        />
        <Checkbox
          label="Active"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
        />
        <Checkbox
          label="Featured"
          name="isFeatured"
          defaultChecked={defaultValues?.isFeatured}
        />
        <Checkbox
          label="New"
          name="isNew"
          defaultChecked={defaultValues?.isNew}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Specifications{" "}
          <span className="text-xs text-slate-400">
            (one per line: label|key|value|unit)
          </span>
        </label>
        <textarea
          name="specifications"
          rows={4}
          defaultValue={defaultValues?.specifications}
          placeholder="Voltage|voltage|24|V"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
        />
      </div>

      <ImageUploader name="images" defaultValue={defaultValues?.images} />

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Documents{" "}
          <span className="text-xs text-slate-400">
            (one per line: title|url|DATASHEET|MANUAL)
          </span>
        </label>
        <textarea
          name="documents"
          rows={3}
          defaultValue={defaultValues?.documents}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Field
          label="SEO title"
          name="seoTitle"
          defaultValue={defaultValues?.seoTitle ?? ""}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Meta description
          </label>
          <textarea
            name="metaDescription"
            rows={2}
            defaultValue={defaultValues?.metaDescription ?? ""}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
