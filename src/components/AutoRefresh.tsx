"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reloads the page's data after a few seconds, e.g. while waiting for Paystack to confirm. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
