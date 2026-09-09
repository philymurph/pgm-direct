"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBrandAction } from "@/actions/admin/brands";

export function DeleteBrandButton({ brandId }: { brandId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (!confirm("Delete this brand?")) return;
        startTransition(async () => {
          await deleteBrandAction(brandId);
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
