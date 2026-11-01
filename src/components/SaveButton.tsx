"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toggleSave } from "@/app/actions/profile";
import { toast } from "./Toaster";

export function SaveButton({
  listingId,
  title,
  initialSaved,
  initialCount,
  big,
}: {
  listingId: string;
  title: string;
  initialSaved: boolean;
  initialCount: number;
  big?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const was = saved;
    setSaved(!was);
    setCount((c) => c + (was ? -1 : 1));
    start(async () => {
      const res = await toggleSave(listingId);
      if (res.error) {
        setSaved(was);
        setCount((c) => c + (was ? 1 : -1));
        if (res.error === "signin") {
          const here = pathname + (params.toString() ? `?${params}` : "");
          router.push(`/login?next=${encodeURIComponent(here)}&why=save`);
        } else toast(res.error);
        return;
      }
      toast(res.saved ? "Saved" : "Removed from saved");
    });
  }

  return (
    <button
      className={big ? "btn ghost" : "fav"}
      aria-label={`${saved ? "Unsave" : "Save"} ${title}`}
      aria-pressed={saved}
      onClick={click}
      disabled={pending}
      style={big ? { color: saved ? "var(--danger)" : undefined } : undefined}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4 7 4c2.2 0 3.7 1.2 5 3 1.3-1.8 2.8-3 5-3 4 0 6.1 4.3 4.6 7.8C19.5 16.4 12 21 12 21z" />
      </svg>
      {big ? (saved ? `Saved · ${count}` : `Save · ${count}`) : count}
    </button>
  );
}
