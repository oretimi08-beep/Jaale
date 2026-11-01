import Link from "next/link";
import { Suspense } from "react";
import { getSavedIds, getViewer, unreadCount } from "@/lib/data";
import { BRAND } from "@/lib/config";
import { DeptTabs } from "./DeptTabs";
import { SearchBox } from "./SearchBox";
import { UserMenu } from "./UserMenu";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label={`${BRAND.name} home`}>
      <i />
      {BRAND.name}
    </Link>
  );
}

export async function Header() {
  const viewer = await getViewer();
  const saved = viewer?.profile ? (await getSavedIds()).size : 0;
  const unread = viewer?.profile ? await unreadCount(viewer.userId) : 0;

  return (
    <header className="site-header">
      <div className="wrap bar">
        <Logo />
        <Suspense fallback={<div className="search" />}>
          <SearchBox />
        </Suspense>
        <Link href="/saved" className="icon hide-sm" aria-label="Saved items">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 20s-7-4.4-9-8.8C1.7 7.9 3.7 4 7.3 4c2 0 3.4 1.1 4.7 2.8C13.3 5.1 14.7 4 16.7 4c3.6 0 5.6 3.9 4.3 7.2C19 15.6 12 20 12 20z" />
          </svg>
          {saved > 0 && <span className="n">{saved}</span>}
        </Link>
        <Link href="/messages" className="icon" aria-label={unread ? `Messages, ${unread} unread` : "Messages"}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" />
          </svg>
          {unread > 0 && <span className="n">{unread}</span>}
        </Link>
        <Link href="/orders" className="icon hide-sm" aria-label="My orders">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 7h18l-2 13H5z" />
            <path d="M8 7a4 4 0 0 1 8 0" />
          </svg>
        </Link>
        {viewer?.profile ? (
          <UserMenu
            name={viewer.profile.full_name}
            username={viewer.profile.username}
            avatarUrl={viewer.profile.avatar_url}
            savedCount={saved}
            isAdmin={viewer.isAdmin}
          />
        ) : viewer ? (
          <Link href="/signup/profile" className="btn ghost">
            Finish profile
          </Link>
        ) : (
          <Link href="/login" className="btn ghost">
            Sign in
          </Link>
        )}
        <Link href="/sell" className="btn sellb">
          Sell now
        </Link>
      </div>
      <Suspense fallback={<nav className="wrap depts" />}>
        <DeptTabs />
      </Suspense>
    </header>
  );
}
