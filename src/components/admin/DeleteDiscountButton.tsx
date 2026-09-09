"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDiscountAction } from "@/actions/admin/discounts";

export function DeleteDiscountButton({ discountId }: { discountId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (!confirm("Delete this discount code?")) return;
        startTransition(async () => {
          await deleteDiscountAction(discountId);
          router.refresh();
        });
      }}
      disabled={isPending}
      className="text-xs text-red-600 hover:underline"
    >
      Delete
    </button>
  );
}
