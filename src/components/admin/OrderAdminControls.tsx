"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addTrackingAction,
  deleteOrderAction,
  initiateRefundAction,
  updateOrderStatusAction,
} from "@/actions/admin/orders";

const FULFILMENT_STATUSES = ["PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];

export function OrderAdminControls({
  orderId,
  orderNumber,
  canRefund,
  canDelete,
}: {
  orderId: string;
  orderNumber: string;
  canRefund: boolean;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

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

      {canDelete && (
        <button
          type="button"
          onClick={() => {
            if (
              !confirm(
                `Permanently delete ${orderNumber}? This cannot be undone.`,
              )
            ) {
              return;
            }
            setError(null);
            startTransition(async () => {
              try {
                await deleteOrderAction(orderId);
                router.push("/admin/orders");
              } catch (deleteError) {
                setError(
                  deleteError instanceof Error
                    ? deleteError.message
                    : "Could not delete order",
                );
              }
            });
          }}
          disabled={isPending}
          className="w-full rounded border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Delete order permanently
        </button>
      )}
    </div>
  );
}
