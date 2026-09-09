"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeCartItemAction, updateCartItemAction } from "@/actions/cart";

interface CartLine {
  id: string;
  productName: string;
  productSlug: string;
  image: string | null;
  variantName: string | null;
  quantity: number;
  unitPriceExVat: number;
  lineTotalIncVat: number;
  stockAvailable: number | null;
  exceedsStock: boolean;
}

export function CartLineItem({ line }: { line: CartLine }) {
  const [quantity, setQuantity] = useState(line.quantity);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function updateQuantity(next: number) {
    setQuantity(next);
    startTransition(async () => {
      await updateCartItemAction(line.id, next);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItemAction(line.id);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 border-b border-slate-100 py-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-slate-50">
        {line.image && (
          <Image
            src={line.image}
            alt=""
            fill
            sizes="80px"
            className="object-contain p-1"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${line.productSlug}`}
          className="text-sm font-medium text-slate-900 hover:text-blue-700"
        >
          {line.productName}
        </Link>
        {line.variantName && (
          <p className="text-xs text-slate-500">{line.variantName}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          €{line.unitPriceExVat.toFixed(2)} ex. VAT each
        </p>
        {line.exceedsStock && (
          <p className="mt-1 text-xs font-medium text-red-600">
            Only {line.stockAvailable ?? 0} available — please reduce the
            quantity.
          </p>
        )}

        <div className="mt-2 flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              updateQuantity(Math.max(1, Number(e.target.value) || 1))
            }
            disabled={isPending}
            className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
          />
          <button
            onClick={remove}
            disabled={isPending}
            className="text-xs text-slate-500 underline hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="shrink-0 text-right text-sm font-semibold text-slate-900">
        €{line.lineTotalIncVat.toFixed(2)}
      </div>
    </div>
  );
}
