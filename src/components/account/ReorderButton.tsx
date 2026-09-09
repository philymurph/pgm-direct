"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderAction } from "@/actions/account";

export function ReorderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await reorderAction(orderId);
          router.push("/cart");
        })
      }
      disabled={isPending}
      className="rounded border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
    >
      {isPending ? "Adding to cart…" : "Reorder these items"}
    </button>
  );
}
