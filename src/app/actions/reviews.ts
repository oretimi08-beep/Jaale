"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { activeViewer, BANNED_MESSAGE } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { BLIND_DAYS, SELLER_TAGS, BUYER_TAGS } from "@/lib/reviews";
import type { FormState } from "@/lib/safe-next";

export async function submitReview(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  const { viewer, error } = await activeViewer();
  if (error === "banned") return { error: BANNED_MESSAGE };
  if (!viewer) redirect(`/login?next=/orders/${orderId}/review`);

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, status, completed_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };
  const role = order.buyer_id === viewer.userId ? "buyer_rates_seller" : order.seller_id === viewer.userId ? "seller_rates_buyer" : null;
  if (!role) return { error: "This isn't your order." };
  if (order.status !== "completed") return { error: "You can leave a review once the order is complete." };

  const stars = Number(form.get("stars"));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Tap the stars to choose a rating." };
  const allowed = role === "buyer_rates_seller" ? SELLER_TAGS : BUYER_TAGS;
  const tags = form.getAll("tags").map(String).filter((t) => allowed.includes(t));
  const comment = String(form.get("comment") ?? "").trim().slice(0, 500) || null;

  // Double-blind: hidden until the other person reviews too, or 7 days after the order completed.
  const blindUntil = new Date(new Date(order.completed_at ?? Date.now()).getTime() + BLIND_DAYS * 864e5).toISOString();
  const { error: insertError } = await admin.from("reviews").insert({
    order_id: order.id,
    reviewer_id: viewer.userId,
    reviewee_id: role === "buyer_rates_seller" ? order.seller_id : order.buyer_id,
    role,
    stars,
    tags,
    comment,
    visible_at: blindUntil,
  });
  if (insertError) {
    return { error: insertError.message.includes("duplicate") ? "You've already reviewed this order." : "We couldn't save your review." };
  }
  // If both have now reviewed, show both straight away.
  const { data: both } = await admin.from("reviews").select("id").eq("order_id", order.id);
  if ((both ?? []).length === 2) {
    await admin.from("reviews").update({ visible_at: new Date().toISOString() }).eq("order_id", order.id).gt("visible_at", new Date().toISOString());
  }
  revalidatePath(`/orders/${order.id}`);
  redirect(`/orders/${order.id}?reviewed=1`);
}
