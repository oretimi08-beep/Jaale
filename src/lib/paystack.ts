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

export type Bank = { name: string; code: string };

// Banks people use most, shown at the top of the list.
const POPULAR = ["Access Bank", "Guaranty Trust Bank", "Zenith Bank", "First Bank of Nigeria", "United Bank For Africa", "OPay Digital Services Limited (OPay)", "Moniepoint MFB", "PalmPay", "Kuda Bank", "Wema Bank", "Fidelity Bank", "Stanbic IBTC Bank", "Sterling Bank", "Union Bank of Nigeria", "Ecobank Nigeria", "Polaris Bank", "First City Monument Bank"];

/** Nigerian banks Paystack can pay into, popular ones first. Refreshed once a day. */
export async function listBanks(): Promise<Bank[]> {
  const res = await fetch("https://api.paystack.co/bank?country=nigeria&currency=NGN&perPage=500", {
    headers: { Authorization: `Bearer ${secret()}` },
    next: { revalidate: 86400 },
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { name: string; code: string; active?: boolean; is_deleted?: boolean }[] };
  const seen = new Set<string>();
  const banks = (json.data ?? [])
    .filter((b) => b.active !== false && !b.is_deleted && !seen.has(b.code) && seen.add(b.code))
    .map((b) => ({ name: b.name.trim(), code: b.code }));
  const rank = (n: string) => {
    const i = POPULAR.findIndex((p) => n.toLowerCase().startsWith(p.toLowerCase()));
    return i === -1 ? 999 : i;
  };
  banks.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  // Paystack's pretend bank, so the flow can be tried in test mode.
  if (isTestMode() && !banks.some((b) => b.code === "001")) banks.unshift({ name: "Paystack Test Bank (test mode only)", code: "001" });
  return banks;
}

/** Asks the bank whose name an account is in. */
export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{ account_name: string }> {
  return call(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
}

/** Registers the account with Paystack so payouts can be sent there later. */
export async function createRecipient(name: string, accountNumber: string, bankCode: string): Promise<{ recipient_code: string }> {
  return call("/transferrecipient", {
    method: "POST",
    body: { type: "nuban", name, account_number: accountNumber, bank_code: bankCode, currency: "NGN" },
  });
}
