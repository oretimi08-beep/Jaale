// Browser-side helpers for phone notifications. Only used in client components.
import { forgetPushSubscription, savePushSubscription } from "@/app/actions/notifications";

export type PushState =
  | "loading"
  | "unsupported" // this browser can't do it
  | "ios-install" // iPhone/iPad: must add to home screen first
  | "denied" // the person blocked notifications for this site
  | "off"
  | "on";

export const PUSH_EVENT = "jaale:push";

export function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function readPushState(): Promise<PushState> {
  if (!supported()) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const sub = await currentSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Asks permission, then links this phone to the account. Returns an error message, or null if it worked. */
export async function turnOnPush(): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "Notifications aren't set up on our side yet.";
  if (!supported()) return "This browser can't show notifications.";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "Notifications are blocked. Allow them in your browser's site settings." : "No problem. You can turn them on any time.";
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
  window.dispatchEvent(new Event(PUSH_EVENT));
  return res.error ?? null;
}

export async function turnOffPush() {
  const sub = await currentSubscription();
  if (sub) {
    await forgetPushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
  window.dispatchEvent(new Event(PUSH_EVENT));
}
