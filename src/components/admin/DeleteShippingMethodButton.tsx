"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteShippingMethodAction } from "@/actions/admin/shipping";

export function DeleteShippingMethodButton({ methodId }: { methodId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (!confirm("Delete this delivery method?")) return;
        startTransition(async () => {
          await deleteShippingMethodAction(methodId);
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
