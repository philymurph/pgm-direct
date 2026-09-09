import "server-only";
import crypto from "node:crypto";

// Server-only abstraction over the Revolut Merchant API. No route/component
// should call the Revolut API directly — everything goes through here so the
// secret key never leaks into client bundles and all call sites share the
// same error handling / API version.
//
// Docs: https://developer.revolut.com/docs/api/merchant

const REVOLUT_API_VERSION = "2026-08-17";

type RevolutEnvironment = "sandbox" | "production";

function getEnvironment(): RevolutEnvironment {
  const env = process.env.REVOLUT_ENVIRONMENT;
  return env === "production" ? "production" : "sandbox";
}

function getBaseUrl(): string {
  return getEnvironment() === "production"
    ? "https://merchant.revolut.com/api"
    : "https://sandbox-merchant.revolut.com/api";
}

function getSecretKey(): string {
  const key = process.env.REVOLUT_SECRET_KEY;
  if (!key) {
    throw new Error("REVOLUT_SECRET_KEY is not configured");
  }
  return key;
}

async function revolutFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getSecretKey()}`,
      "Revolut-Api-Version": REVOLUT_API_VERSION,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Revolut API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export interface RevolutOrder {
  id: string;
  token: string;
  state: string;
  checkout_url?: string;
  amount: number;
  currency: string;
  outstanding_amount: number;
}

export interface CreateRevolutOrderInput {
  /** Amount in the currency's minor unit (e.g. cents for EUR). */
  amountMinorUnits: number;
  currency: string;
  description: string;
  /** Our internal order number, stored as merchant_order_data for reconciliation. */
  merchantOrderRef: string;
  customerEmail?: string;
}

export async function createRevolutOrder(
  input: CreateRevolutOrderInput,
): Promise<RevolutOrder> {
  return revolutFetch<RevolutOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountMinorUnits,
      currency: input.currency,
      description: input.description,
      merchant_order_data: { reference: input.merchantOrderRef },
      customer: input.customerEmail
        ? { email: input.customerEmail }
        : undefined,
    }),
  });
}

export async function getRevolutOrder(orderId: string): Promise<RevolutOrder> {
  return revolutFetch<RevolutOrder>(`/orders/${orderId}`, { method: "GET" });
}

export async function refundRevolutOrder(
  orderId: string,
  amountMinorUnits?: number,
): Promise<unknown> {
  return revolutFetch(`/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(amountMinorUnits ? { amount: amountMinorUnits } : {}),
  });
}

export function getRevolutPublicKey(): string {
  const key = process.env.REVOLUT_PUBLIC_KEY;
  if (!key) {
    throw new Error("REVOLUT_PUBLIC_KEY is not configured");
  }
  return key;
}

export function getRevolutEnvironment(): RevolutEnvironment {
  return getEnvironment();
}

/**
 * Verifies a Revolut webhook request per
 * https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature
 *
 * `rawBody` MUST be the exact, unparsed request body bytes/string — signing
 * is sensitive to whitespace, so re-serialising parsed JSON will not match.
 */
export function verifyRevolutWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  signingSecret: string;
  toleranceMs?: number;
}): boolean {
  const {
    rawBody,
    signatureHeader,
    timestampHeader,
    signingSecret,
    toleranceMs = 5 * 60 * 1000,
  } = params;

  if (!signatureHeader || !timestampHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() - timestamp) > toleranceMs) return false;

  const payloadToSign = `v1.${timestampHeader}.${rawBody}`;
  const expected =
    "v1=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(payloadToSign, "utf8")
      .digest("hex");

  // Revolut-Signature can contain multiple comma-separated signatures during secret rotation.
  const provided = signatureHeader.split(",").map((s) => s.trim());
  return provided.some((sig) => timingSafeEqual(sig, expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
