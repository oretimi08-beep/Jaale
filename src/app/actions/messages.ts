"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { activeViewer, BANNED_MESSAGE, getListing } from "@/lib/data";
import { checkMessage } from "@/lib/contact-guard";
import { nairaInputToKobo, naira } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

// Lowest offer allowed, as a share of the asking price. Stops insulting lowballs.
const MIN_OFFER_SHARE = 0.5;

/** Opens (or reuses) the chat between this buyer and the seller about an item. */
export async function openConversation(listingId: string, intent: "ask" | "offer") {
  const { viewer, error } = await activeViewer();
  if (error === "banned") redirect("/?suspended=1");
  if (!viewer) redirect(`/login?next=/item/${listingId}&why=${intent === "offer" ? "offer" : "message"}`);
  const listing = await getListing(listingId);
  if (!listing) redirect("/");
  if (listing.seller_id === viewer.userId) redirect(`/item/${listingId}`);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", viewer.userId)
    .maybeSingle();
  let id = existing?.id as string | undefined;
  if (!id) {
    const { data, error: insertError } = await admin
      .from("conversations")
      .insert({ listing_id: listingId, buyer_id: viewer.userId, seller_id: listing.seller_id })
      .select("id")
      .single();
    if (insertError || !data) redirect(`/item/${listingId}`);
    id = data.id as string;
  }
  redirect(`/messages/${id}${intent === "offer" ? "?offer=1" : ""}`);
}

async function loadConversation(conversationId: string, userId: string) {
  const admin = createAdminClient();
  const { data: c } = await admin.from("conversations").select("*").eq("id", conversationId).maybeSingle();
  if (!c || (c.buyer_id !== userId && c.seller_id !== userId)) return null;
  return { c, admin, role: c.buyer_id === userId ? ("buyer" as const) : ("seller" as const) };
}

async function touch(admin: ReturnType<typeof createAdminClient>, conversationId: string, role: "buyer" | "seller") {
  const now = new Date().toISOString();
  await admin
    .from("conversations")
    .update({ last_message_at: now, [role === "buyer" ? "buyer_read_at" : "seller_read_at"]: now })
    .eq("id", conversationId);
}

export async function sendMessage(conversationId: string, body: string): Promise<{ ok?: boolean; flagged?: boolean; error?: string }> {
  const { viewer, error } = await activeViewer();
  if (error) return { error: error === "banned" ? BANNED_MESSAGE : "Please sign in again." };
  const text = body.trim().slice(0, 1000);
  if (!text) return { error: "Type a message first." };
  const ctx = await loadConversation(conversationId, viewer.userId);
  if (!ctx) return { error: "Conversation not found." };

  const guard = checkMessage(text);
  const { error: insertError } = await ctx.admin
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: viewer.userId, body: text, flagged: guard.flagged });
  if (insertError) return { error: "Message not sent. Try again." };
  await touch(ctx.admin, conversationId, ctx.role);
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true, flagged: guard.flagged };
}

export async function makeOffer(conversationId: string, amount: string): Promise<{ ok?: boolean; error?: string }> {
  const { viewer, error } = await activeViewer();
  if (error) return { error: error === "banned" ? BANNED_MESSAGE : "Please sign in again." };
  const ctx = await loadConversation(conversationId, viewer.userId);
  if (!ctx) return { error: "Conversation not found." };
  const { data: listing } = await ctx.admin.from("listings").select("price_kobo, status").eq("id", ctx.c.listing_id).single();
  if (!listing || listing.status !== "active") return { error: "This item isn't for sale any more." };

  const kobo = nairaInputToKobo(amount);
  const min = Math.ceil((listing.price_kobo * MIN_OFFER_SHARE) / 100) * 100;
  if (kobo < min) return { error: `Offers start from ${naira(min)} (half the asking price).` };
  if (kobo >= listing.price_kobo) return { error: `That's the full price. Just tap Buy now for ${naira(listing.price_kobo)}.` };

  // Only one offer is open at a time: a new one replaces the last.
  await ctx.admin.from("messages").update({ offer_status: "withdrawn" }).eq("conversation_id", conversationId).eq("offer_status", "pending");
  const { error: insertError } = await ctx.admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: viewer.userId,
    body: ctx.role === "buyer" ? "Made an offer" : "Sent a counter-offer",
    offer_kobo: kobo,
    offer_status: "pending",
  });
  if (insertError) return { error: "Offer not sent. Try again." };
  await touch(ctx.admin, conversationId, ctx.role);
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true };
}

export async function respondToOffer(messageId: string, answer: "accepted" | "declined" | "withdrawn"): Promise<{ ok?: boolean; error?: string }> {
  const { viewer, error } = await activeViewer();
  if (error) return { error: error === "banned" ? BANNED_MESSAGE : "Please sign in again." };
  const admin = createAdminClient();
  const { data: m } = await admin.from("messages").select("id, conversation_id, sender_id, offer_status").eq("id", messageId).maybeSingle();
  if (!m || m.offer_status !== "pending") return { error: "This offer has already been answered." };
  const ctx = await loadConversation(m.conversation_id, viewer.userId);
  if (!ctx) return { error: "Conversation not found." };
  const mine = m.sender_id === viewer.userId;
  if (answer === "withdrawn" ? !mine : mine) return { error: "You can't do that to this offer." };

  const { data: updated } = await admin
    .from("messages")
    .update({ offer_status: answer })
    .eq("id", m.id)
    .eq("offer_status", "pending")
    .select("id");
  if (!updated?.length) return { error: "This offer has already been answered." };
  if (answer === "accepted") {
    // Any older accepted price in this chat is replaced by the new one.
    await admin.from("messages").update({ offer_status: "withdrawn" }).eq("conversation_id", m.conversation_id).eq("offer_status", "accepted").neq("id", m.id);
  }
  await touch(admin, m.conversation_id, ctx.role);
  revalidatePath(`/messages/${m.conversation_id}`);
  return { ok: true };
}

export async function markRead(conversationId: string) {
  const { viewer } = await activeViewer();
  if (!viewer) return;
  const ctx = await loadConversation(conversationId, viewer.userId);
  if (!ctx) return;
  await ctx.admin
    .from("conversations")
    .update({ [ctx.role === "buyer" ? "buyer_read_at" : "seller_read_at"]: new Date().toISOString() })
    .eq("id", conversationId);
}
