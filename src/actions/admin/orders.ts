"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { refundRevolutOrder } from "@/lib/payments/revolut";

const FULFILMENT_STATUSES = [
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

export async function updateOrderStatusAction(orderId: string, status: string) {
  await requireAdmin();
  if (
    !FULFILMENT_STATUSES.includes(
      status as (typeof FULFILMENT_STATUSES)[number],
    )
  ) {
    throw new Error("Invalid fulfilment status");
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { status: status as never },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function addTrackingAction(orderId: string, formData: FormData) {
  await requireAdmin();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const trackingCarrier = String(formData.get("trackingCarrier") ?? "").trim();

  await prisma.order.update({
    where: { id: orderId },
    data: { trackingNumber, trackingCarrier, status: "SHIPPED" },
  });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function initiateRefundAction(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payments: { where: { status: "PAID" } } },
  });

  const payment = order.payments[0];
  if (!payment?.providerOrderId)
    throw new Error("No completed payment found for this order");

  await refundRevolutOrder(payment.providerOrderId);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
    }),
  ]);

  revalidatePath(`/admin/orders/${orderId}`);
}
