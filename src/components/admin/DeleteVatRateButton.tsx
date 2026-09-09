"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteVatRateAction } from "@/actions/admin/vat-rates";

export function DeleteVatRateButton({ vatRateId }: { vatRateId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="text-right">
      <button
        onClick={() => {
          if (!confirm("Delete this VAT rate?")) return;
          startTransition(async () => {
            try {
              await deleteVatRateAction(vatRateId);
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not delete VAT rate",
              );
            }
          });
        }}
        disabled={isPending}
        className="text-xs text-red-600 hover:underline"
      >
        Delete
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
