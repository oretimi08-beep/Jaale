"use client";

import { useSyncExternalStore } from "react";

type Mode = "system" | "light" | "dark";
const LABEL: Record<Mode, string> = { system: "Theme: match my device", light: "Theme: light", dark: "Theme: dark" };
const NEXT: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
const EVENT = "jaale:theme";

function read(): Mode {
  try {
    const t = localStorage.getItem("jaale-theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function ThemeToggle({ asMenuItem }: { asMenuItem?: boolean }) {
  const mode = useSyncExternalStore(subscribe, read, () => "system" as Mode);

  function cycle() {
    const next = NEXT[mode];
    try {
      if (next === "system") localStorage.removeItem("jaale-theme");
      else localStorage.setItem("jaale-theme", next);
    } catch {}
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button type="button" onClick={cycle} role={asMenuItem ? "menuitem" : undefined} className={asMenuItem ? "" : "link"}>
      {mode === "dark" ? "☾ " : mode === "light" ? "☀ " : "◐ "}
      {LABEL[mode]}
    </button>
  );
}
