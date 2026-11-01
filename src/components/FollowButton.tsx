"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions/profile";
import { toast } from "./Toaster";

export function FollowButton({
  profileId,
  name,
  initial,
  signedIn,
  small,
}: {
  profileId: string;
  name: string;
  initial: boolean;
  signedIn: boolean;
  small?: boolean;
}) {
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function click() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}&why=follow`);
      return;
    }
    const was = following;
    setFollowing(!was);
    start(async () => {
      const res = await toggleFollow(profileId, pathname);
      if (res.error) {
        setFollowing(was);
        toast(res.error === "signin" ? "Sign in to follow sellers." : res.error);
        return;
      }
      toast(res.following ? `Following ${name}. Their new items show in your Following feed.` : `Unfollowed ${name}`);
      router.refresh();
    });
  }

  return (
    <button className={`btn ${following ? "ghost" : ""} ${small ? "sm" : ""}`} onClick={click} disabled={pending}>
      {following ? (small ? "Following" : "Following ✓") : "Follow"}
    </button>
  );
}
