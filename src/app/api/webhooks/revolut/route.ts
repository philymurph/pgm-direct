import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyRevolutWebhookSignature } from "@/lib/payments/revolut";
import { sendOrderConfirmationEmail } from "@/lib/email-templates";
import {
  completeOrderPayment,
  refundOrderPayment,
} from "@/lib/order-lifecycle";

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
  const eventId = body.id ?? `${body.event}:${body.order_id}`;
  let webhookEventId: string;
  try {
    const event = await prisma.webhookEvent.create({
      data: {
        provider: "revolut",
        eventId,
        eventType: body.event,
        payload: body as never,
      },
    });
    webhookEventId = event.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw error;
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: body.order_id },
    });

    if (!payment) {
      throw new Error(`Revolut webhook for unknown order ${body.order_id}`);
    }

    switch (body.event) {
      case "ORDER_AUTHORISED":
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: {
              id: payment.id,
              status: { in: ["PENDING", "FAILED"] },
            },
            data: { status: "AUTHORIZED", failureReason: null },
          }),
          prisma.order.updateMany({
            where: { id: payment.orderId, paymentStatus: "PENDING" },
            data: { paymentStatus: "AUTHORIZED" },
          }),
        ]);
        break;

      case "ORDER_COMPLETED": {
        const paidOrder = await completeOrderPayment(
          payment.id,
          payment.orderId,
        );
        if (paidOrder) await sendOrderConfirmationEmail(paidOrder);
        break;
      }

      case "ORDER_PAYMENT_FAILED":
      case "ORDER_PAYMENT_DECLINED":
        // Revolut returns the order to pending so the customer can retry.
        // Keep the local order and its inventory reservation open as well.
        await prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: ["PENDING", "AUTHORIZED", "FAILED"] },
          },
          data: { status: "FAILED", failureReason: body.event },
        });
        break;

      case "ORDER_PAYMENT_REFUNDED":
        await refundOrderPayment(payment.id, payment.orderId);
        break;

      default:
        break;
    }
  } catch (error) {
    // A failed event must remain retryable. Keeping its idempotency row would
    // make Revolut's next delivery look like a successfully handled duplicate.
    await prisma.webhookEvent
      .delete({ where: { id: webhookEventId } })
      .catch(() => undefined);
    console.error("Failed to process Revolut webhook", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
