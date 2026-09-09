"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/actions/admin/products";

export function ProductActions({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <button
        onClick={() =>
          startTransition(async () => {
            await toggleProductActiveAction(productId);
            router.refresh();
          })
        }
        disabled={isPending}
        className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={() => {
          if (
            !confirm("Delete this product permanently? This cannot be undone.")
          )
            return;
          startTransition(async () => {
            await deleteProductAction(productId);
            router.push("/admin/products");
          });
        }}
        disabled={isPending}
        className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
