import "server-only";
import { prisma } from "./db";
import {
  consumeOrderInventory,
  releaseOrderInventory,
  restockOrderInventory,
} from "./inventory";

async function removePurchasedItemsFromCart(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  order: {
    sourceCartId: string | null;
    items: Array<{
      productId: string | null;
      variantId: string | null;
      quantity: number;
    }>;
  },
) {
  if (!order.sourceCartId) return;

  for (const item of order.items) {
    if (!item.productId) continue;
    const cartItem = await tx.cartItem.findFirst({
      where: {
        cartId: order.sourceCartId,
        productId: item.productId,
        variantId: item.variantId,
      },
    });
    if (!cartItem) continue;

    if (cartItem.quantity <= item.quantity) {
      await tx.cartItem.delete({ where: { id: cartItem.id } });
    } else {
      await tx.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity: { decrement: item.quantity } },
      });
    }
  }
}

export async function completeOrderPayment(paymentId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: {
        status: "PAID",
        paymentStatus: "PAID",
        paidAt: new Date(),
      },
    });
    if (claimed.count !== 1) return null;

    await consumeOrderInventory(tx, orderId);
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", failureReason: null },
    });

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: true,
        customer: { include: { user: { select: { email: true } } } },
      },
    });

    if (order.discountId) {
      await tx.discount.update({
        where: { id: order.discountId },
        data: { usedCount: { increment: 1 } },
      });
    }
    await removePurchasedItemsFromCart(tx, order);

    return order;
  });
}

export async function refundOrderPayment(paymentId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { not: "REFUNDED" } },
      data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
    });
    if (claimed.count !== 1) return false;

    await restockOrderInventory(tx, orderId);
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });
    return true;
  });
}

export async function cancelPendingOrder(orderId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
      },
      data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
    });
    if (claimed.count !== 1) return false;

    await releaseOrderInventory(tx, orderId);
    await tx.payment.updateMany({
      where: { orderId, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "CANCELLED" },
    });
    return true;
  });
}

export async function releaseExpiredOrderReservations(
  limit = 100,
): Promise<number> {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      inventoryReservationExpiresAt: { lte: new Date() },
    },
    select: { id: true },
    orderBy: { inventoryReservationExpiresAt: "asc" },
    take: limit,
  });

  let released = 0;
  for (const order of expiredOrders) {
    if (await cancelPendingOrder(order.id)) released += 1;
  }
  return released;
}

export async function deleteDiscardableOrder(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { in: ["PENDING_PAYMENT", "PAYMENT_FAILED", "CANCELLED"] },
        paymentStatus: { in: ["PENDING", "FAILED", "CANCELLED"] },
      },
      data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
    });

    if (claimed.count !== 1) {
      throw new Error(
        "Only abandoned, failed, or cancelled unpaid orders can be deleted",
      );
    }

    await releaseOrderInventory(tx, orderId);
    await tx.order.delete({ where: { id: orderId } });
  });
}
