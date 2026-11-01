// The rules for orders and money. Kept free of database code so they can be tested on their own.
import { RELEASE_WINDOW_DAYS } from "./config";
import { protectionFee } from "./money";

export type OrderStatus =
  | "pending_payment" // order made, buyer hasn't paid yet
  | "paid_held" // paid; we hold the money, seller not paid yet
  | "shipped" // seller has sent it (or it's ready for pickup)
  | "delivered" // arrived; buyer has 2 days to check it
  | "completed" // buyer happy (or 2 days passed): seller's money released
  | "disputed" // buyer reported a problem: payout frozen
  | "refunded" // buyer got their money back
  | "cancelled"; // never paid, or cancelled before payment

export type Role = "buyer" | "seller" | "system";

export type Action =
  | "ship" // seller: sent it / ready for pickup
  | "deliver" // seller: it arrived
  | "confirm" // buyer: item received, all good
  | "report" // buyer: report a problem
  | "cancel" // seller: can't sell after all (refund buyer), or buyer abandons an unpaid order
  | "auto_release"; // system: 2 days after delivery with no problem reported

const RULES: Record<Action, { from: OrderStatus[]; to: OrderStatus; by: Role[] }> = {
  ship: { from: ["paid_held"], to: "shipped", by: ["seller"] },
  deliver: { from: ["shipped"], to: "delivered", by: ["seller"] },
  confirm: { from: ["shipped", "delivered"], to: "completed", by: ["buyer"] },
  report: { from: ["shipped", "delivered"], to: "disputed", by: ["buyer"] },
  cancel: { from: ["pending_payment", "paid_held"], to: "cancelled", by: ["seller", "buyer"] },
  auto_release: { from: ["delivered"], to: "completed", by: ["system"] },
};

export type OrderSnapshot = {
  status: OrderStatus;
  release_at: string | null;
};

/** What the order becomes after an action, or an explanation of why it can't happen. */
export function nextStatus(
  order: OrderSnapshot,
  action: Action,
  role: Role,
  now: Date = new Date(),
): { ok: true; status: OrderStatus } | { ok: false; reason: string } {
  const rule = RULES[action];
  if (!rule.by.includes(role)) return { ok: false, reason: "You can't do that on this order." };
  if (!rule.from.includes(order.status)) return { ok: false, reason: "This order has already moved on." };
  // A buyer can only cancel before paying. Once paid, only the seller can cancel (and the buyer is refunded).
  if (action === "cancel" && role === "buyer" && order.status !== "pending_payment") {
    return { ok: false, reason: "Paid orders can't be cancelled by the buyer. Report a problem instead." };
  }
  if (action === "report" && order.status === "delivered" && order.release_at && now >= new Date(order.release_at)) {
    return { ok: false, reason: "The 2 days to report a problem have passed." };
  }
  if (action === "auto_release" && (!order.release_at || now < new Date(order.release_at))) {
    return { ok: false, reason: "Not time to release yet." };
  }
  // Cancelling a paid order means the buyer is refunded.
  if (action === "cancel" && order.status === "paid_held") return { ok: true, status: "refunded" };
  return { ok: true, status: rule.to };
}

export type Quote = { itemKobo: number; protectionKobo: number; deliveryKobo: number; totalKobo: number };

/** The price breakdown a buyer pays. Always worked out on the server, never trusted from the browser. */
export function quote(itemKobo: number, deliveryKobo: number): Quote {
  if (!Number.isInteger(itemKobo) || itemKobo <= 0) throw new Error("Item price must be a positive whole number of kobo.");
  if (!Number.isInteger(deliveryKobo) || deliveryKobo < 0) throw new Error("Delivery must be zero or more kobo.");
  const protectionKobo = protectionFee(itemKobo);
  return { itemKobo, protectionKobo, deliveryKobo, totalKobo: itemKobo + protectionKobo + deliveryKobo };
}

/** When the money is released if the buyer does nothing: 2 days after delivery. */
export function releaseTime(deliveredAt: Date): Date {
  return new Date(deliveredAt.getTime() + RELEASE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/** The seller always receives the full item price. Selling is free. */
export function sellerPayoutKobo(order: { item_kobo: number }): number {
  return order.item_kobo;
}

/** A refund gives the buyer back everything they paid: item, protection fee and delivery. */
export function refundKobo(order: { total_kobo: number }): number {
  return order.total_kobo;
}

/** Checks a Paystack payment really is for this order, for the right amount, in naira. */
export function paymentMatches(
  order: { total_kobo: number; paystack_reference: string },
  payment: { status: string; amount: number; currency: string; reference: string },
): { ok: true } | { ok: false; reason: string } {
  if (payment.reference !== order.paystack_reference) return { ok: false, reason: "reference mismatch" };
  if (payment.status !== "success") return { ok: false, reason: `payment ${payment.status}` };
  if (payment.currency !== "NGN") return { ok: false, reason: `wrong currency ${payment.currency}` };
  if (payment.amount !== order.total_kobo) return { ok: false, reason: `amount ${payment.amount} ≠ ${order.total_kobo}` };
  return { ok: true };
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  paid_held: "Paid, money held",
  shipped: "On the way",
  delivered: "Delivered, checking",
  completed: "Completed",
  disputed: "Problem reported",
  refunded: "Refunded",
  cancelled: "Cancelled",
};
