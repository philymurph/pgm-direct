import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRevolutWebhookSignature } from "@/lib/payments/revolut";

// Revolut webhook events we act on. See:
// https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/using-webhooks
type RevolutWebhookBody = {
  event: string;
  order_id: string;
  merchant_order_ext_ref?: string;
  id?: string;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("revolut-signature");
  const timestampHeader = req.headers.get("revolut-request-timestamp");
  const signingSecret = process.env.REVOLUT_WEBHOOK_SECRET;

  if (!signingSecret) {
    console.error(
      "REVOLUT_WEBHOOK_SECRET is not configured; rejecting webhook",
    );
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const isValid = verifyRevolutWebhookSignature({
    rawBody,
    signatureHeader,
    timestampHeader,
    signingSecret,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: RevolutWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Idempotency guard: safe to receive/process the same event more than once.
  const eventId =
    body.id ?? `${body.event}:${body.order_id}:${timestampHeader}`;
  const alreadyProcessed = await prisma.webhookEvent
    .create({
      data: {
        provider: "revolut",
        eventId,
        eventType: body.event,
        payload: body as never,
      },
    })
    .then(() => false)
    .catch(() => true);

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { providerOrderId: body.order_id },
    include: { order: { include: { items: true } } },
  });

  if (!payment) {
    console.error(`Revolut webhook for unknown order ${body.order_id}`);
    return NextResponse.json({ received: true });
  }

  switch (body.event) {
    case "ORDER_AUTHORISED":
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "AUTHORIZED" },
      });
      break;

    case "ORDER_COMPLETED":
      await handleOrderCompleted(payment.id, payment.orderId);
      break;

    case "ORDER_PAYMENT_FAILED":
    case "ORDER_PAYMENT_DECLINED":
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", failureReason: body.event },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" },
        }),
      ]);
      break;

    case "ORDER_PAYMENT_REFUNDED":
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
        }),
      ]);
      break;

    default:
      // Unhandled event types are acknowledged so Revolut doesn't retry them.
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleOrderCompleted(paymentId: string, orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    // Idempotency: only move PENDING_PAYMENT orders to PAID once; a replayed
    // webhook for an already-paid order must not double-reserve stock.
    if (order.status !== "PENDING_PAYMENT") return;

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID" },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", paymentStatus: "PAID", paidAt: new Date() },
    });

    for (const item of order.items) {
      if (!item.productId) continue;
      await tx.inventory.updateMany({
        where: { productId: item.productId },
        data: { quantityOnHand: { decrement: item.quantity } },
      });
    }
  });

  // Order confirmation email would be dispatched here once an email provider
  // is configured (see EMAIL_* env vars) — intentionally not stubbed with
  // fake sender/contact details.
}
