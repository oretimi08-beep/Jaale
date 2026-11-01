"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "./Toaster";

/** A button for a feature that isn't built yet. Still asks people to sign in first, like the real thing will. */
export function ComingSoonButton({
  children,
  message,
  className = "btn",
  needsSignIn,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  needsSignIn?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button
      type="button"
      className={className}
      onClick={() => (needsSignIn ? router.push(`/login?next=${encodeURIComponent(pathname)}`) : toast(message))}
    >
      {children}
    </button>
  );
}
