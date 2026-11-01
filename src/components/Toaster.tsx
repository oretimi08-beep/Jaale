"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Messages shown after an action redirects back with a flag in the address.
const FLAGS: Record<string, string> = {
  posted: "Listed! Your item is live.",
  saved: "Changes saved.",
  removed: "Listing removed.",
  signedout: "Signed out. See you soon.",
  welcome: "Welcome! Your profile is ready.",
  changed: "Password changed.",
};

/** Show a short message from anywhere: toast("Saved"). */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("jaale:toast", { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const key = Object.keys(FLAGS).find((k) => params.has(k));
    if (!key) return;
    setTimeout(() => setMsg(FLAGS[key]), 0);
    const rest = new URLSearchParams(params);
    rest.delete(key);
    const qs = rest.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    const on = (e: Event) => setMsg((e as CustomEvent<string>).detail);
    window.addEventListener("jaale:toast", on);
    return () => window.removeEventListener("jaale:toast", on);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);

  return msg ? (
    <div className="toast" role="status" aria-live="polite">
      {msg}
    </div>
  ) : null;
}
