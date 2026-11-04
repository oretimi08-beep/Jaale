"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { forgetPushSubscription, saveNotifyChoices, savePushSubscription, sendTestNotification } from "@/app/actions/notifications";
import { NOTIFY_OPTIONS, type NotifyChoices } from "@/lib/notifications";
import { currentSubscription, isIos, PUSH_EVENT, readPushState, turnOffPush, turnOnPush, type PushState } from "@/lib/push-client";
import { toast } from "./Toaster";

function usePushState() {
  const [state, setState] = useState<PushState>("loading");
  const refresh = useCallback(() => {
    readPushState().then(setState, () => setState("unsupported"));
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener(PUSH_EVENT, refresh);
    return () => window.removeEventListener(PUSH_EVENT, refresh);
  }, [refresh]);
  return state;
}

/**
 * Keeps this phone linked to whoever is signed in. After signing out, the phone stops getting that account's alerts;
 * after signing in again (or as someone else), it's linked to the new account.
 */
export function PushSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return;
    const key = `jaale-push-sync:${userId ?? "out"}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    currentSubscription()
      .then((sub) => {
        if (!sub) return;
        if (!userId) return forgetPushSubscription(sub.endpoint);
        if (Notification.permission === "granted") return savePushSubscription(JSON.parse(JSON.stringify(sub)));
      })
      .catch(() => {});
  }, [userId]);
  return null;
}

function IosSteps() {
  return (
    <ol className="steps-list">
      <li>
        Open this site in <b>Safari</b>.
      </li>
      <li>
        Tap the <b>Share</b> button (the square with an arrow pointing up).
      </li>
      <li>
        Choose <b>Add to Home Screen</b>, then <b>Add</b>.
      </li>
      <li>Open the app from your home screen, come back to Settings and tap “Turn on notifications”.</li>
    </ol>
  );
}

export function NotificationSettings({ initial, ready }: { initial: NotifyChoices; ready: boolean }) {
  const state = usePushState();
  const [choices, setChoices] = useState(initial);
  const [busy, start] = useTransition();

  const on = () =>
    start(async () => {
      const err = await turnOnPush().catch(() => "Something went wrong. Try again.");
      toast(err ?? "Notifications are on for this device.");
    });
  const off = () =>
    start(async () => {
      await turnOffPush().catch(() => {});
      toast("Notifications are off for this device.");
    });
  const test = () =>
    start(async () => {
      const res = await sendTestNotification();
      toast(res.error ?? res.ok ?? "");
    });
  const pick = (key: keyof NotifyChoices, value: boolean) => {
    const next = { ...choices, [key]: value };
    setChoices(next);
    start(async () => {
      const res = await saveNotifyChoices(next);
      if (res.error) toast(res.error);
    });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!ready ? (
        <div className="note warm">
          <b>Coming soon.</b> Phone notifications aren&apos;t switched on yet.
        </div>
      ) : state === "loading" ? (
        <p className="sample">Checking this device…</p>
      ) : state === "on" ? (
        <>
          <div className="note">
            <b>✓ On for this device.</b> You&apos;ll get a notification even when the site is closed.
          </div>
          <div className="two">
            <button type="button" className="btn sm" onClick={test} disabled={busy}>
              Send me a test
            </button>
            <button type="button" className="btn ghost sm" onClick={off} disabled={busy}>
              Turn off on this device
            </button>
          </div>
        </>
      ) : state === "off" ? (
        <>
          <p className="sample" style={{ fontSize: 14 }}>
            Get a notification on this phone when someone makes an offer, sends a message, or when your order moves along.
          </p>
          <button type="button" className="btn" onClick={on} disabled={busy}>
            {busy ? "Turning on…" : "Turn on notifications"}
          </button>
        </>
      ) : state === "ios-install" ? (
        <div className="note warm">
          <b>On iPhone, add the app to your home screen first.</b> Apple only allows notifications from apps on your home
          screen. It takes 10 seconds:
          <IosSteps />
        </div>
      ) : state === "denied" ? (
        <div className="note err">
          <b>Notifications are blocked for this site.</b> Tap the icon beside the web address (or open your browser&apos;s
          site settings), allow notifications, then reload this page.
        </div>
      ) : (
        <div className="note warm">
          <b>This browser can&apos;t show notifications.</b>{" "}
          {isIosSafe() ? "Update your iPhone to iOS 16.4 or newer, then add the app to your home screen." : "Try Chrome, Edge, Firefox or Safari."}
        </div>
      )}

      <fieldset className="notify-choices" disabled={!ready}>
        <legend className="sample" style={{ fontSize: 14, marginBottom: 6 }}>
          What should we tell you about? (This applies to all your devices.)
        </legend>
        {NOTIFY_OPTIONS.map((o) => (
          <label key={o.key} className="check-row">
            <input type="checkbox" checked={choices[o.key]} onChange={(e) => pick(o.key, e.target.checked)} />
            <span>
              <b>{o.label}</b>
              <small>{o.hint}</small>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function isIosSafe() {
  try {
    return isIos();
  } catch {
    return false;
  }
}

/** A small, dismissible prompt shown on Messages and Orders until notifications are on. */
export function PushNudge({ ready }: { ready: boolean }) {
  const state = usePushState();
  const [hidden, setHidden] = useState(true);
  const [busy, start] = useTransition();

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem("jaale-push-nudge");
    } catch {}
    const id = requestAnimationFrame(() => setHidden(dismissed));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready || hidden || (state !== "off" && state !== "ios-install")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem("jaale-push-nudge", "1");
    } catch {}
    setHidden(true);
  };

  return (
    <div className="note warm push-nudge">
      <span>
        <b>Never miss an offer.</b>{" "}
        {state === "ios-install"
          ? "Add the app to your home screen to get notifications on your iPhone."
          : "Get a notification on your phone for offers, messages and orders."}
      </span>
      <span className="push-nudge-actions">
        {state === "ios-install" ? (
          <a href="/settings#notifications" className="btn sm">
            Show me how
          </a>
        ) : (
          <button
            type="button"
            className="btn sm"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const err = await turnOnPush().catch(() => "Something went wrong. Try again.");
                toast(err ?? "Notifications are on.");
              })
            }
          >
            Turn on
          </button>
        )}
        <button type="button" className="btn ghost sm" onClick={dismiss}>
          Not now
        </button>
      </span>
    </div>
  );
}
