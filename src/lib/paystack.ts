import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Talks to Paystack. Test mode only until Timi says go live:
// a live key is refused unless PAYSTACK_LIVE_ENABLED=yes is also set on purpose.

const API = "https://api.paystack.co";

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("Payments aren't set up yet (PAYSTACK_SECRET_KEY is missing).");
  if (key.startsWith("sk_live_") && process.env.PAYSTACK_LIVE_ENABLED !== "yes") {
    throw new Error("A live Paystack key was found, but live payments haven't been switched on.");
  }
  return key;
}

export function paystackReady(): boolean {
  try {
    secret();
    return true;
  } catch {
    return false;
  }
}

export function isTestMode(): boolean {
  return !process.env.PAYSTACK_SECRET_KEY?.trim().startsWith("sk_live_");
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(API + path, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !json.status) throw new Error(json.message || `Paystack error ${res.status}`);
  return json.data as T;
}

export type Channel = "card" | "bank_transfer" | "ussd";

export async function initializePayment(p: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  channels: Channel[];
  metadata: Record<string, unknown>;
}): Promise<{ authorization_url: string; reference: string }> {
  return call("/transaction/initialize", {
    method: "POST",
    body: {
      email: p.email,
      amount: p.amountKobo,
      currency: "NGN",
      reference: p.reference,
      callback_url: p.callbackUrl,
      channels: p.channels,
      metadata: p.metadata,
    },
  });
}

export type PaystackTransaction = { status: string; amount: number; currency: string; reference: string };

export async function verifyPayment(reference: string): Promise<PaystackTransaction> {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Gives the buyer their money back. Paystack confirms later with a refund.processed event. */
export async function refundPayment(reference: string, amountKobo: number) {
  return call<{ status: string }>("/refund", { method: "POST", body: { transaction: reference, amount: amountKobo } });
}

/** True when a webhook really came from Paystack (signed with our secret key). */
export function validSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
