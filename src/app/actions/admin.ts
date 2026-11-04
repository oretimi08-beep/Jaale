"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data";
import { resolveDispute } from "@/lib/order-service";
import { sendPayout } from "@/lib/payout-service";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) throw new Error("Admins only.");
  return viewer;
}

type Result = { ok?: boolean; error?: string };

export async function adminResolveDispute(orderId: string, outcome: "refund" | "release", note: string): Promise<Result> {
  await requireAdmin();
  const res = await resolveDispute(orderId, outcome, note);
  revalidatePath("/admin", "layout");
  return res.ok ? { ok: true } : { error: res.reason };
}

export async function adminMarkPayoutPaid(payoutId: string): Promise<Result> {
  await requireAdmin();
  // Not while Paystack is sending it, or the seller could be paid twice.
  const { data } = await createAdminClient()
    .from("payouts")
    .update({ status: "paid", paid_by: "manual", paid_at: new Date().toISOString(), last_error: null })
    .eq("id", payoutId)
    .in("status", ["pending", "failed"])
    .select("id");
  revalidatePath("/admin", "layout");
  return data?.length ? { ok: true } : { error: "This payout is already paid or on its way through Paystack." };
}

export async function adminSendPayout(payoutId: string): Promise<Result> {
  await requireAdmin();
  const res = await sendPayout(payoutId);
  revalidatePath("/admin", "layout");
  if (res.status === "paid") return { ok: true };
  if (res.status === "processing") return { ok: true };
  return { error: res.message ?? "Couldn't send it yet." };
}

export async function adminSetBan(profileId: string, banned: boolean, reason: string): Promise<Result> {
  const viewer = await requireAdmin();
  if (profileId === viewer.userId) return { error: "You can't suspend yourself." };
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update(banned ? { banned_at: new Date().toISOString(), banned_reason: reason.slice(0, 300) || null } : { banned_at: null, banned_reason: null })
    .eq("id", profileId);
  // A suspended seller's items come off sale. Unbanning doesn't relist them; the seller can do that.
  if (banned) await admin.from("listings").update({ status: "removed" }).eq("seller_id", profileId).in("status", ["active", "reserved"]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminRemoveListing(listingId: string): Promise<Result> {
  await requireAdmin();
  await createAdminClient().from("listings").update({ status: "removed" }).eq("id", listingId);
  revalidatePath("/", "layout");
  return { ok: true };
}
