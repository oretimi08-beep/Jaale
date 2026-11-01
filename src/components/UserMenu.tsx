"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "./Avatar";
import { ThemeToggle } from "./ThemeToggle";

export function UserMenu({
  name,
  username,
  avatarUrl,
  savedCount,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
  savedCount: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // The menu remembers which page it was opened on, so it closes itself when you move to another page.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((typeof value === "function" ? value(open) : value) ? pathname : null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} style={{ position: "relative" }}>
      <button className="icon" aria-label="My account" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={name} url={avatarUrl} size={34} seed={username} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div style={{ padding: "8px 12px 6px" }}>
            <b>{name}</b>
            <div className="muted" style={{ fontSize: 13 }}>@{username}</div>
          </div>
          <hr />
          <Link href={`/u/${username}`} role="menuitem">My profile and listings</Link>
          <Link href="/sell" role="menuitem">Sell an item</Link>
          <Link href="/saved" role="menuitem">Saved items{savedCount ? ` (${savedCount})` : ""}</Link>
          <Link href="/orders" role="menuitem">My orders</Link>
          <Link href="/settings" role="menuitem">Settings and password</Link>
          <hr />
          <ThemeToggle asMenuItem />
          <form action={signOut}>
            <button type="submit" role="menuitem" style={{ width: "100%", color: "var(--danger)" }}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
