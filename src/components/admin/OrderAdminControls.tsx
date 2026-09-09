"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addTrackingAction,
  initiateRefundAction,
  updateOrderStatusAction,
} from "@/actions/admin/orders";

const FULFILMENT_STATUSES = ["PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];

export function OrderAdminControls({
  orderId,
  canRefund,
}: {
  orderId: string;
  canRefund: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTracking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await addTrackingAction(orderId, formData);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700">
          Fulfilment status
        </label>
        <select
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;
            startTransition(async () => {
              await updateOrderStatusAction(orderId, e.target.value);
              router.refresh();
            });
          }}
          disabled={isPending}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Change status…</option>
          {FULFILMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <form
        onSubmit={handleTracking}
        className="space-y-2 rounded border border-slate-200 p-3"
      >
        <p className="text-xs font-medium text-slate-700">
          Add tracking (marks as Shipped)
        </p>
        <input
          name="trackingCarrier"
          placeholder="Carrier"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="trackingNumber"
          placeholder="Tracking number"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white"
        >
          Save tracking
        </button>
      </form>

      {canRefund && (
        <button
          onClick={() => {
            if (!confirm("Refund this order via Revolut?")) return;
            startTransition(async () => {
              await initiateRefundAction(orderId);
              router.refresh();
            });
          }}
          disabled={isPending}
          className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Refund payment
        </button>
      )}
    </div>
  );
}
