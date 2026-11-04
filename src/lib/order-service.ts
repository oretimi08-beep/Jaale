import "server-only";
import { createAdminClient } from "./supabase/admin";
import { nextStatus, paymentMatches, refundKobo, releaseTime, sellerPayoutKobo, type Action, type OrderStatus, type Role } from "./orders";
import { refundPayment, verifyPayment } from "./paystack";
import { sendPayout } from "./payout-service";
import { orderNote, type OrderEvent } from "./notifications";
import { notify } from "./push";

// Order changes go through here, using the server's full-access key.
// Every change is conditional on the order still being in the status we expect,
// so double clicks and repeated webhooks can never apply a change twice.

export type OrderRow = {
  id: string;
  number: number;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  listing_title: string;
  listing_photo_url: string | null;
  item_kobo: number;
  protection_fee_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  delivery_method: string;
  delivery_label: string;
  delivery_address: string | null;
  delivery_phone: string | null;
  status: OrderStatus;
  paystack_reference: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  release_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  refund_status: "pending" | "processed" | "failed" | null;
  refund_reason: string | null;
  created_at: string;
};

const db = () => createAdminClient();

async function load(id: string): Promise<OrderRow | null> {
  const { data } = await db().from("orders").select("*").eq("id", id).maybeSingle();
  return (data as OrderRow) ?? null;
}

function tell(userId: string, event: OrderEvent, order: OrderRow) {
  notify(userId, orderNote(event, { item: order.listing_title, kobo: sellerPayoutKobo(order), orderId: order.id }));
}

async function issueRefund(order: OrderRow, reason: string) {
  try {
    await refundPayment(order.paystack_reference, refundKobo(order));
    await db().from("orders").update({ refund_status: "pending", refund_reason: reason }).eq("id", order.id);
  } catch (e) {
    console.error("refund failed", order.id, e);
    await db().from("orders").update({ refund_status: "failed", refund_reason: reason }).eq("id", order.id);
  }
}

/** Asks Paystack whether this order was paid, and records it if so. Safe to call many times. */
export async function confirmPayment(
  orderId: string,
  opts: { retries?: number; justReturned?: boolean } = {},
): Promise<{ status: OrderStatus; message?: string; stillChecking?: boolean }> {
  const order = await load(orderId);
  if (!order) return { status: "cancelled", message: "Order not found." };
  if (order.status !== "pending_payment") return { status: order.status };

  // Right after the buyer is sent back, Paystack can still say "ongoing" for a second or two.
  let payment;
  for (let attempt = 0; ; attempt++) {
    try {
      payment = await verifyPayment(order.paystack_reference);
    } catch {
      return { status: order.status, message: "We couldn't reach Paystack to check your payment. Refresh in a moment." };
    }
    // Paystack calls a transaction "abandoned" until it settles. If the buyer was just sent back
    // from the payment page, that only means "not updated yet", so keep checking.
    const unsettled =
      ["ongoing", "pending", "processing", "queued"].includes(payment.status) ||
      (payment.status === "abandoned" && !!opts.justReturned);
    if (!unsettled || attempt >= (opts.retries ?? 0)) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (payment.status !== "success" && payment.status !== "failed" && payment.status !== "reversed") {
    const fresh = await load(order.id); // the webhook may have got there first
    return { status: fresh?.status ?? order.status, stillChecking: payment.status !== "abandoned" || !!opts.justReturned };
  }
  const check = paymentMatches(order, payment);
  if (!check.ok) {
    console.error("payment check failed", order.id, check.reason);
    return { status: order.status, message: "This payment didn't go through. You haven't been charged for this order." };
  }

  const { data: result, error } = await db().rpc("mark_order_paid", { p_order: order.id, p_amount: payment.amount });
  if (error) throw new Error(error.message);
  if (result === "conflict") {
    await issueRefund(order, "Someone else bought this item first.");
    return { status: "refunded", message: "Sorry, someone else paid for this item a moment before you. Your money is being refunded in full." };
  }
  if (result === "paid") tell(order.seller_id, "sold", order);
  const fresh = await load(order.id);
  return { status: fresh?.status ?? order.status };
}

/** Applies a buyer or seller action to an order, after checking they're allowed. */
export async function applyAction(
  orderId: string,
  userId: string,
  action: Exclude<Action, "auto_release">,
  extra?: { reason?: string; details?: string },
): Promise<{ ok: true; status: OrderStatus } | { ok: false; reason: string }> {
  const order = await load(orderId);
  if (!order) return { ok: false, reason: "Order not found." };
  const role: Role | null = order.buyer_id === userId ? "buyer" : order.seller_id === userId ? "seller" : null;
  if (!role) return { ok: false, reason: "This isn't your order." };

  const next = nextStatus(order, action, role);
  if (!next.ok) return next;

  const now = new Date();
  const changes: Record<string, unknown> = { status: next.status };
  if (action === "ship") changes.shipped_at = now.toISOString();
  if (action === "deliver") {
    changes.delivered_at = now.toISOString();
    changes.release_at = releaseTime(now).toISOString();
  }
  if (action === "confirm") changes.completed_at = now.toISOString();
  if (action === "cancel") changes.cancelled_at = now.toISOString();

  // Only applies if nobody else changed the order in the meantime.
  const { data: updated } = await db()
    .from("orders")
    .update(changes)
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id");
  if (!updated?.length) return { ok: false, reason: "This order was just updated. Refresh and try again." };

  if (action === "ship") tell(order.buyer_id, "shipped", order);
  if (action === "deliver") tell(order.buyer_id, "delivered", order);
  if (action === "confirm") tell(order.seller_id, "confirmed", order);
  if (action === "report") tell(order.seller_id, "reported", order);
  if (action === "cancel" && order.status === "paid_held" && role === "seller") tell(order.buyer_id, "cancelled", order);

  if (action === "confirm") await createPayout(order);
  if (action === "report") {
    await db().from("disputes").insert({
      order_id: order.id,
      opened_by: userId,
      reason: (extra?.reason ?? "Other").slice(0, 80),
      details: extra?.details?.slice(0, 1000) || null,
    });
  }
  if (action === "cancel" && order.status === "paid_held") {
    await issueRefund(order, "The seller cancelled the order.");
    // The item goes back on sale; the seller can remove it if it's gone.
    await db().from("listings").update({ status: "active" }).eq("id", order.listing_id).eq("status", "sold");
  }
  return { ok: true, status: next.status };
}

async function createPayout(order: OrderRow) {
  // One payout per order (the table enforces it), so this is safe to repeat.
  await db()
    .from("payouts")
    .upsert({ order_id: order.id, seller_id: order.seller_id, amount_kobo: sellerPayoutKobo(order) }, { onConflict: "order_id", ignoreDuplicates: true });
  // Try to send it straight away. If that can't happen yet, the daily job and the admin page pick it up.
  const { data } = await db().from("payouts").select("id").eq("order_id", order.id).maybeSingle();
  if (data) await sendPayout(data.id as string).catch((e) => console.error("payout", order.id, e));
}

/** Releases money for every delivered order whose 2 days are up. Returns how many were released. */
export async function autoRelease(now: Date = new Date()): Promise<number> {
  const { data } = await db()
    .from("orders")
    .select("*")
    .eq("status", "delivered")
    .lte("release_at", now.toISOString())
    .limit(200);
  let count = 0;
  for (const order of (data ?? []) as OrderRow[]) {
    const next = nextStatus(order, "auto_release", "system", now);
    if (!next.ok) continue;
    const { data: updated } = await db()
      .from("orders")
      .update({ status: next.status, completed_at: now.toISOString() })
      .eq("id", order.id)
      .eq("status", "delivered")
      .select("id");
    if (updated?.length) {
      tell(order.seller_id, "released", order);
      await createPayout(order);
      count++;
    }
  }
  return count;
}

/** Records Paystack's confirmation that a refund went through (or failed). */
export async function markRefund(reference: string, status: "processed" | "failed") {
  await db().from("orders").update({ refund_status: status }).eq("paystack_reference", reference);
}

export async function findOrderIdByReference(reference: string): Promise<string | null> {
  const { data } = await db().from("orders").select("id").eq("paystack_reference", reference).maybeSingle();
  return (data?.id as string) ?? null;
}

/** The price a seller agreed with this buyer in chat, if any. */
export async function acceptedOfferKobo(listingId: string, buyerId: string): Promise<number | null> {
  const { data: convo } = await db().from("conversations").select("id").eq("listing_id", listingId).eq("buyer_id", buyerId).maybeSingle();
  if (!convo) return null;
  const { data } = await db()
    .from("messages")
    .select("offer_kobo")
    .eq("conversation_id", convo.id)
    .eq("offer_status", "accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.offer_kobo as number) ?? null;
}

/** Our team's decision on a reported problem: refund the buyer, or release the money to the seller. */
export async function resolveDispute(orderId: string, outcome: "refund" | "release", note: string): Promise<{ ok: boolean; reason?: string }> {
  const order = await load(orderId);
  if (!order || order.status !== "disputed") return { ok: false, reason: "This order isn't waiting on a decision." };
  const now = new Date().toISOString();
  const { data: updated } = await db()
    .from("orders")
    .update(outcome === "refund" ? { status: "refunded", cancelled_at: now } : { status: "completed", completed_at: now })
    .eq("id", order.id)
    .eq("status", "disputed")
    .select("id");
  if (!updated?.length) return { ok: false, reason: "Someone else just updated this order." };
  await db()
    .from("disputes")
    .update({ status: outcome === "refund" ? "resolved_refund" : "resolved_release", resolution: note.slice(0, 500) || null })
    .eq("order_id", order.id);
  tell(order.buyer_id, outcome === "refund" ? "decided_refund_buyer" : "decided_release_buyer", order);
  tell(order.seller_id, outcome === "refund" ? "decided_refund_seller" : "decided_release_seller", order);
  if (outcome === "refund") await issueRefund(order, "Our team refunded you after reviewing the problem.");
  else await createPayout(order);
  return { ok: true };
}
