"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustInventoryAction } from "@/actions/admin/products";

export function InventoryForm({
  productId,
  quantityOnHand,
  lowStockThreshold,
  allowBackorder,
}: {
  productId: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await adjustInventoryAction(formData);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded border border-slate-200 bg-white p-4"
    >
      <input type="hidden" name="productId" value={productId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Quantity on hand
          </label>
          <input
            name="quantityOnHand"
            type="number"
            defaultValue={quantityOnHand}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Low stock threshold
          </label>
          <input
            name="lowStockThreshold"
            type="number"
            defaultValue={lowStockThreshold}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="allowBackorder"
          defaultChecked={allowBackorder}
        />
        Allow backorder (customers may order beyond available stock)
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {isPending ? "Updating…" : "Update stock"}
      </button>
    </form>
  );
}
