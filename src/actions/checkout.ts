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

export interface StartCheckoutResult {
  success: boolean;
  error?: string;
  orderNumber?: string;
  revolutOrderToken?: string;
  revolutPublicKey?: string;
  revolutEnvironment?: string;
}

export async function startCheckoutAction(
  input: unknown,
): Promise<StartCheckoutResult> {
  const ip = getClientIp(await headers());
  if (!rateLimit(`checkout:${ip}`, 20, 60_000).allowed) {
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

  const session = await getSession();

  try {
    const order = await createPendingOrderFromCart(
      parsed.data,
      session?.customerId ?? null,
    );

    const revolutOrder = await createRevolutOrder({
      amountMinorUnits: Math.round(Number(order.totalIncVat) * 100),
      currency: "EUR",
      description: `PGM Direct order ${order.orderNumber}`,
      merchantOrderRef: order.orderNumber,
      customerEmail: parsed.data.guestEmail,
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
      revolutPublicKey: getRevolutPublicKey(),
      revolutEnvironment: getRevolutEnvironment(),
    };
  } catch (error) {
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
