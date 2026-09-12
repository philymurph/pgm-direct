"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createPendingOrderFromCart, CheckoutError } from "@/lib/orders";
import { checkoutSchema } from "@/lib/validation";
import {
  createRevolutOrder,
  getRevolutPublicKey,
  getRevolutEnvironment,
} from "@/lib/payments/revolut";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  cancelPendingOrder,
  releaseExpiredOrderReservations,
} from "@/lib/order-lifecycle";
import { getProductionReadinessReport } from "@/lib/production-readiness";

export interface StartCheckoutResult {
  success: boolean;
  error?: string;
  orderNumber?: string;
  revolutOrderToken?: string;
  revolutPublicKey?: string;
  revolutEnvironment?: string;
  checkoutAccessToken?: string;
}

export async function startCheckoutAction(
  input: unknown,
): Promise<StartCheckoutResult> {
  const ip = getClientIp(await headers());
  if (!(await rateLimit(`checkout:${ip}`, 20, 60_000)).allowed) {
    return {
      success: false,
      error: "Too many checkout attempts. Please wait a moment and try again.",
    };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details",
    };
  }

  if (process.env.REVOLUT_ENVIRONMENT === "production") {
    const readiness = await getProductionReadinessReport();
    if (!readiness.ready) {
      console.error("Production checkout is not ready", readiness.blockers);
      return {
        success: false,
        error:
          "Checkout is temporarily unavailable. Please contact us for assistance.",
      };
    }
  }

  const session = await getSession();
  if (!session && !parsed.data.guestEmail) {
    return { success: false, error: "Enter an email address for your order" };
  }

  const customerEmail = session?.userId
    ? (
        await prisma.user.findUnique({
          where: { id: session.userId },
          select: { email: true },
        })
      )?.email
    : parsed.data.guestEmail;

  let pendingOrderId: string | null = null;
  try {
    await releaseExpiredOrderReservations(10).catch((cleanupError) => {
      console.error("Failed to release expired reservations", cleanupError);
    });
    const publicKey = getRevolutPublicKey();
    const order = await createPendingOrderFromCart(
      parsed.data,
      session?.customerId ?? null,
    );
    pendingOrderId = order.id;

    const revolutOrder = await createRevolutOrder({
      amountMinorUnits: Math.round(Number(order.totalIncVat) * 100),
      currency: "EUR",
      description: `PGM Direct order ${order.orderNumber}`,
      merchantOrderRef: order.orderNumber,
      customerEmail,
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "revolut",
        providerOrderId: revolutOrder.id,
        status: "PENDING",
        amount: order.totalIncVat,
        currency: "EUR",
      },
    });

    return {
      success: true,
      orderNumber: order.orderNumber,
      revolutOrderToken: revolutOrder.token,
      revolutPublicKey: publicKey,
      revolutEnvironment: getRevolutEnvironment(),
      checkoutAccessToken: order.checkoutAccessToken ?? undefined,
    };
  } catch (error) {
    if (pendingOrderId) {
      await cancelPendingOrder(pendingOrderId).catch((cleanupError) => {
        console.error("Failed to release checkout reservation", cleanupError);
      });
    }
    if (error instanceof CheckoutError) {
      return { success: false, error: error.message };
    }
    console.error("Checkout failed", error);
    return {
      success: false,
      error: "We couldn't start checkout. Please try again.",
    };
  }
}
