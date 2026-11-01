"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BANNED_MESSAGE, getListing, getViewer } from "@/lib/data";
import { isBulky } from "@/lib/catalog";
import { deliveryOptions } from "@/lib/delivery";
import { quote } from "@/lib/orders";
import { acceptedOfferKobo, applyAction } from "@/lib/order-service";
import { initializePayment, paystackReady, type Channel } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, type FormState } from "@/lib/safe-next";

const PICKUP = new Set(["self_pickup", "pickup_point"]);
const CHANNELS: Record<string, Channel> = { card: "card", transfer: "bank_transfer", ussd: "ussd" };

function normalisePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[789][01]\d{8}$/.test(d) ? `+234${d}` : null;
}

export async function startCheckout(listingId: string, _: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.profile || !viewer.email) redirect(`/login?next=/checkout/${listingId}&why=buy`);
  const fields: Record<string, string> = {};
  form.forEach((v, k) => typeof v === "string" && !k.startsWith("$") && (fields[k] = v));

  if (viewer.banned) return { error: BANNED_MESSAGE, fields };
  if (!paystackReady()) return { error: "Payments aren't switched on yet. Please try again later.", fields };

  const listing = await getListing(listingId);
  if (!listing) return { error: "This item isn't available any more.", fields };
  if (listing.seller_id === viewer.userId) return { error: "You can't buy your own item.", fields };
  if (listing.status !== "active") return { error: "Sorry, this item has just been sold or reserved.", fields };

  // Delivery price comes from our own table, never from the browser.
  const option = deliveryOptions(isBulky(listing.category), listing.city, listing.area).find((o) => o.key === fields.delivery);
  if (!option) return { error: "Choose how you'd like to get the item.", fields };
  const needsAddress = !PICKUP.has(option.key);
  const address = (fields.address ?? "").trim().replace(/\s+/g, " ");
  if (needsAddress && address.length < 10) return { error: "Add your full delivery address, including the area.", fields };
  const phone = normalisePhone(fields.phone ?? "");
  if (!phone) return { error: "Add a Nigerian phone number so the rider can reach you, e.g. 803 123 4567.", fields };
  const channel = CHANNELS[fields.method] ?? "card";

  // A price agreed in chat replaces the asking price, but never raises it.
  const offer = await acceptedOfferKobo(listing.id, viewer.userId);
  const itemKobo = offer && offer < listing.price_kobo ? offer : listing.price_kobo;
  const q = quote(itemKobo, option.kobo);
  const reference = `JAALE-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`.toUpperCase();
  const admin = createAdminClient();

  // Reuse this buyer's unpaid order for the same item instead of piling up new ones.
  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("buyer_id", viewer.userId)
    .eq("status", "pending_payment")
    .maybeSingle();

  const row = {
    listing_id: listing.id,
    buyer_id: viewer.userId,
    seller_id: listing.seller_id,
    listing_title: listing.title,
    listing_photo_url: listing.photos[0]?.url ?? null,
    item_kobo: q.itemKobo,
    protection_fee_kobo: q.protectionKobo,
    delivery_kobo: q.deliveryKobo,
    total_kobo: q.totalKobo,
    delivery_method: option.key,
    delivery_label: option.label,
    delivery_address: needsAddress ? address.slice(0, 300) : null,
    delivery_phone: phone,
    paystack_reference: reference,
  };
  const saved = existing
    ? await admin.from("orders").update(row).eq("id", existing.id).select("id").single()
    : await admin.from("orders").insert(row).select("id").single();
  if (saved.error || !saved.data) return { error: "We couldn't start your order. Please try again.", fields };
  const orderId = saved.data.id as string;

  let payUrl: string;
  try {
    const init = await initializePayment({
      email: viewer.email,
      amountKobo: q.totalKobo,
      reference,
      callbackUrl: `${siteUrl()}/orders/${orderId}?paid=1`,
      channels: [channel],
      metadata: { order_id: orderId, listing_id: listing.id, cancel_action: `${siteUrl()}/orders/${orderId}` },
    });
    payUrl = init.authorization_url;
  } catch (e) {
    console.error("paystack initialize", e);
    return { error: "We couldn't reach Paystack. Please try again in a moment.", fields };
  }
  redirect(payUrl);
}

export async function orderAction(
  orderId: string,
  action: "ship" | "deliver" | "confirm" | "report" | "cancel",
  extra?: { reason?: string; details?: string },
): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "Please sign in again." };
  const res = await applyAction(orderId, viewer.userId, action, extra);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return res.ok ? { ok: true } : { error: res.reason };
}
