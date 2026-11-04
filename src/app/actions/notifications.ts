"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data";
import { deliver, pushReady } from "@/lib/push";
import { deviceName, type NotifyChoices } from "@/lib/notifications";
import { BRAND } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

function validSub(sub: Sub): sub is { endpoint: string; keys: { p256dh: string; auth: string } } {
  return (
    typeof sub?.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === "string" &&
    typeof sub.keys?.auth === "string" &&
    sub.keys.p256dh.length < 200 &&
    sub.keys.auth.length < 100
  );
}

/** Links this phone to the signed-in person. If someone else used this phone before, it now belongs to this person. */
export async function savePushSubscription(sub: Sub): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." };
  if (!validSub(sub)) return { error: "This browser sent something unexpected. Try again." };
  const device = deviceName((await headers()).get("user-agent") ?? "");
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, user_id: viewer.userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, device }, { onConflict: "endpoint" });
  if (error) return { error: "Couldn't turn notifications on. Try again." };
  return { ok: true };
}

/** Stops notifications to this phone. Works signed out too, so a phone stops getting alerts after signing out. */
export async function forgetPushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return { ok: false };
  await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

export async function saveNotifyChoices(choices: NotifyChoices): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." };
  const { error } = await createAdminClient()
    .from("notification_settings")
    .upsert({
      user_id: viewer.userId,
      offers: !!choices.offers,
      messages: !!choices.messages,
      orders: !!choices.orders,
      updated_at: new Date().toISOString(),
    });
  if (error) return { error: "Couldn't save. Try again." };
  revalidatePath("/settings");
  return { ok: true };
}

export async function sendTestNotification(): Promise<{ ok?: string; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." };
  if (!pushReady()) return { error: "Notifications aren't set up on our side yet." };
  const sent = await deliver(
    viewer.userId,
    { kind: "orders", title: `Hello from ${BRAND.name} 👋`, body: "Notifications are working. This is how offers, messages and orders will reach you.", url: "/settings#notifications", tag: "test" },
    false,
  );
  return sent ? { ok: `Sent to ${sent} device${sent === 1 ? "" : "s"}. It should pop up in a few seconds.` } : { error: "No phone is set up yet. Tap “Turn on notifications” first." };
}
