"use client";

import { useState, useTransition } from "react";
import { addToCartAction } from "@/actions/cart";
import { useRouter } from "next/navigation";

export function AddToCartButton({
  productId,
  variantId,
  maxQuantity,
  compact = false,
}: {
  productId: string;
  variantId?: string | null;
  maxQuantity?: number | null;
  compact?: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction({ productId, variantId, quantity });
      if (!result.success) {
        setError(result.error ?? "Could not add to cart");
        return;
      }
      setAdded(true);
      router.refresh();
      setTimeout(() => setAdded(false), 2000);
    });
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex items-center gap-2">
        {!compact && (
          <input
            type="number"
            min={1}
            max={maxQuantity ?? undefined}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-16 rounded border border-slate-300 px-2 py-2 text-center text-sm"
            aria-label="Quantity"
          />
        )}
        <button
          onClick={handleAdd}
          disabled={isPending}
          className={`flex-1 rounded bg-blue-700 font-medium text-white hover:bg-blue-800 disabled:opacity-60 ${
            compact ? "px-3 py-1.5 text-sm" : "px-4 py-2.5"
          }`}
        >
          {isPending ? "Adding…" : added ? "Added ✓" : "Add to cart"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
