"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAddressAction } from "@/actions/account";

export function DeleteAddressButton({ addressId }: { addressId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await deleteAddressAction(addressId);
          router.refresh();
        })
      }
      disabled={isPending}
      className="text-xs text-slate-500 underline hover:text-red-600"
    >
      Delete
    </button>
  );
}
