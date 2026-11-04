// What each phone notification says. Kept free of database code so it can be tested on its own.
import { naira } from "./money";

export type NotifyKind = "offers" | "messages" | "orders";

export type Note = { kind: NotifyKind; title: string; body: string; url: string; tag?: string };

export type NotifyChoices = Record<NotifyKind, boolean>;

export const DEFAULT_CHOICES: NotifyChoices = { offers: true, messages: true, orders: true };

export const NOTIFY_OPTIONS: { key: NotifyKind; label: string; hint: string }[] = [
  { key: "offers", label: "Offers", hint: "Someone makes, accepts or declines an offer" },
  { key: "messages", label: "Messages", hint: "Someone sends you a chat message" },
  { key: "orders", label: "Orders and money", hint: "Sales, deliveries, problems and payouts" },
];

/** Shortens text for a notification, on a word where possible. */
export function short(text: string, max = 110): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`;
}

const first = (name: string) => name.trim().split(/\s+/)[0] || name;

export function newMessage(p: { from: string; item: string; text: string; conversationId: string }): Note {
  return {
    kind: "messages",
    title: `${first(p.from)} sent you a message`,
    body: `${short(p.text, 90)} · ${short(p.item, 30)}`,
    url: `/messages/${p.conversationId}`,
    tag: `chat-${p.conversationId}`,
  };
}

export function newOffer(p: { from: string; item: string; kobo: number; counter: boolean; conversationId: string }): Note {
  return {
    kind: "offers",
    title: p.counter ? `Counter-offer: ${naira(p.kobo)}` : `New offer: ${naira(p.kobo)}`,
    body: p.counter
      ? `${first(p.from)} replied with ${naira(p.kobo)} for ${short(p.item, 50)}. Accept or reply.`
      : `${first(p.from)} offered ${naira(p.kobo)} for your ${short(p.item, 50)}. Accept, decline or counter.`,
    url: `/messages/${p.conversationId}`,
    tag: `offer-${p.conversationId}`,
  };
}

export function offerAnswered(p: {
  from: string;
  item: string;
  kobo: number;
  answer: "accepted" | "declined";
  youAreBuyer: boolean;
  conversationId: string;
}): Note {
  const accepted = p.answer === "accepted";
  return {
    kind: "offers",
    title: accepted ? `Offer accepted: ${naira(p.kobo)}` : "Offer declined",
    body: accepted
      ? p.youAreBuyer
        ? `${first(p.from)} accepted ${naira(p.kobo)} for ${short(p.item, 50)}. Buy it now at that price.`
        : `${first(p.from)} accepted ${naira(p.kobo)} for ${short(p.item, 50)}. They can now buy it at that price.`
      : `${first(p.from)} declined ${naira(p.kobo)} for ${short(p.item, 50)}. You can make another offer.`,
    url: `/messages/${p.conversationId}`,
    tag: `offer-${p.conversationId}`,
  };
}

export type OrderEvent =
  | "sold" // to seller: buyer paid
  | "shipped" // to buyer
  | "delivered" // to buyer: 2 days to check
  | "confirmed" // to seller: buyer is happy
  | "reported" // to seller: buyer reported a problem
  | "cancelled" // to buyer: seller cancelled, refund on its way
  | "released" // to seller: 2 days passed with no problem
  | "decided_refund_buyer" // our team refunded the buyer
  | "decided_refund_seller"
  | "decided_release_buyer" // our team released the money to the seller
  | "decided_release_seller"
  | "paid_out"; // to seller: money reached their bank

export function orderNote(event: OrderEvent, p: { item: string; kobo: number; orderId: string }): Note {
  const item = short(p.item, 50);
  const money = naira(p.kobo);
  const text: Record<OrderEvent, [string, string]> = {
    sold: ["You made a sale!", `${item} was paid for. ${money} is held safely for you. Pack it and send it out.`],
    shipped: ["Your item is on its way", `The seller has sent ${item}. We'll let you know when it arrives.`],
    delivered: ["Your item has arrived", `Check ${item} and tap "All good", or report a problem within 2 days.`],
    confirmed: ["The buyer is happy", `${money} for ${item} is on its way to your bank.`],
    reported: ["The buyer reported a problem", `Your payout for ${item} is paused while our team looks into it.`],
    cancelled: ["Order cancelled", `The seller cancelled ${item}. Your money is being refunded in full.`],
    released: ["Your money is released", `2 days passed with no problem, so ${money} for ${item} is on its way to your bank.`],
    decided_refund_buyer: ["Problem resolved: refund", `Our team reviewed ${item} and you're getting your money back.`],
    decided_refund_seller: ["Problem resolved: buyer refunded", `Our team reviewed ${item} and refunded the buyer.`],
    decided_release_buyer: ["Problem resolved", `Our team reviewed ${item} and released the money to the seller.`],
    decided_release_seller: ["Problem resolved: you're being paid", `Our team reviewed ${item}. ${money} is on its way to your bank.`],
    paid_out: ["Money sent to your bank", `${money} for ${item} has been paid into your account.`],
  };
  const [title, body] = text[event];
  return { kind: "orders", title, body, url: `/orders/${p.orderId}`, tag: `order-${p.orderId}` };
}

/** Rough device name, so people can tell their phones apart. */
export function deviceName(userAgent: string): string {
  const ua = userAgent || "";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "browser";
  return `${os} · ${browser}`;
}
