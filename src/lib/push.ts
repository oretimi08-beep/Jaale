import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "./supabase/admin";
import type { Note } from "./notifications";

// Sends phone notifications (web push). Free: the phone's own browser (Google, Apple, Mozilla) delivers them.
// The two keys prove the notifications come from us. The public one is safe to share; the private one is secret.

/** Tidies a key pasted into a settings screen: stray spaces, line breaks, quote marks or "=" padding. */
function cleanKey(raw: string | undefined) {
  return (raw ?? "")
    .replace(/\s+/g, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let state: "unset" | "ok" | "bad" = "unset";
/** True when notifications can be sent. Never throws: a bad key just turns notifications off and logs why. */
export function pushReady(): boolean {
  if (state !== "unset") return state === "ok";
  const pub = cleanKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const priv = cleanKey(process.env.VAPID_PRIVATE_KEY);
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "https://jaale.vercel.app", pub, priv);
    state = "ok";
  } catch (e) {
    console.error("Notifications are off: the VAPID keys are not valid.", (e as Error).message);
    state = "bad";
  }
  return state === "ok";
}

/**
 * Notifies someone on every phone they've turned notifications on for, if they want this kind of alert.
 * Runs after the response is sent, so it never slows the page down, and it never throws.
 */
export function notify(userId: string | null | undefined, note: Note) {
  if (!userId) return;
  const job = () => deliver(userId, note, true).catch((e) => console.error("notify", note.kind, e));
  try {
    after(job);
  } catch {
    void job(); // not inside a request (e.g. a script): just send it
  }
}

/** Sends straight away and reports how many devices it reached. `respectChoices` false is for test messages. */
export async function deliver(userId: string, note: Note, respectChoices: boolean): Promise<number> {
  if (!pushReady()) return 0;
  const db = createAdminClient();
  const [{ data: choices }, { data: subs }] = await Promise.all([
    db.from("notification_settings").select("offers, messages, orders").eq("user_id", userId).maybeSingle(),
    db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId),
  ]);
  if (respectChoices && choices && choices[note.kind] === false) return 0;
  if (!subs?.length) return 0;

  const payload = JSON.stringify({ title: note.title, body: note.body, url: note.url, tag: note.tag });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24, // keep trying for a day if the phone is off
          urgency: "high",
        });
        sent++;
        await db.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("endpoint", s.endpoint);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: the phone turned notifications off or the app was removed. Forget it.
        if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        else console.error("push failed", status, (e as Error).message);
      }
    }),
  );
  return sent;
}
