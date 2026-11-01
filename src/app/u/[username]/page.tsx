import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { ItemCard } from "@/components/ItemCard";
import { FollowButton } from "@/components/FollowButton";
import { ComingSoonButton } from "@/components/ComingSoonButton";
import { signOut } from "@/app/actions/auth";
import {
  getFollowList,
  getFollowingIds,
  getProfileByUsername,
  getSavedIds,
  getSellerListings,
  getViewer,
} from "@/lib/data";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> };
const TABS = [
  ["listings", "Listings"],
  ["reviews", "Reviews"],
  ["followers", "Followers"],
  ["following", "Following"],
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getProfileByUsername((await params).username);
  return { title: found ? `${found.profile.full_name} (@${found.profile.username})` : "Profile not found" };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const requested = (await searchParams).tab;
  const tab = TABS.find(([k]) => k === requested)?.[0] ?? "listings";
  const found = await getProfileByUsername(username);
  if (!found) notFound();
  const { profile: p, stats } = found;

  const viewer = await getViewer();
  const me = viewer?.userId === p.id;
  const [following, saved] = await Promise.all([getFollowingIds(), getSavedIds()]);
  const isFollowing = following.has(p.id);
  const joined = new Date(p.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" });
  const base = `/u/${p.username}`;

  let body: React.ReactNode = null;
  if (tab === "listings") {
    const items = await getSellerListings(p.id, me);
    body = items.length ? (
      <div className="grid mini">
        {items.map((it) => (
          <ItemCard key={it.id} item={it} saved={saved.has(it.id)} />
        ))}
      </div>
    ) : (
      <p className="empty">
        {me ? (
          <>
            You haven&apos;t listed anything yet. <Link href="/sell" className="link">Sell your first item</Link>
          </>
        ) : (
          "No listings right now."
        )}
      </p>
    );
  } else if (tab === "reviews") {
    body = (
      <p className="empty">
        {me ? "Reviews appear here after your first sale or purchase. " : "No reviews yet. "}
        Buyers rate sellers, and sellers rate buyers. Both reviews appear at the same time.
      </p>
    );
  } else {
    const people = await getFollowList(p.id, tab as "followers" | "following");
    body = people.length ? (
      people.map((x) => (
        <div className="prow" key={x.id}>
          <Link href={`/u/${x.username}`} className="prow-l">
            <Avatar name={x.full_name} url={x.avatar_url} seed={x.username} />
            <span>
              <b>{x.full_name}</b>
              <small>@{x.username} · {x.city}</small>
            </span>
          </Link>
          {viewer?.userId !== x.id && (
            <FollowButton profileId={x.id} name={x.full_name} initial={following.has(x.id)} signedIn={!!viewer?.profile} small />
          )}
        </div>
      ))
    ) : (
      <p className="empty">
        {tab === "followers"
          ? me
            ? "No followers yet. Share your profile link to get your first followers."
            : "No followers yet."
          : me
            ? "You're not following anyone yet. Follow sellers to see their new listings in your Following feed."
            : "Not following anyone yet."}
      </p>
    );
  }

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>{me ? "My profile" : "Profile"}</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>

        <div className="phead">
          <Avatar name={p.full_name} url={p.avatar_url} seed={p.username} className="xl" />
          <div style={{ minWidth: 0 }}>
            <h2>
              {p.full_name}
              {p.verified_bank && <span className="tick">✓</span>}
            </h2>
            <small>
              @{p.username} · {p.city} · Joined {joined}
            </small>
            {p.is_demo && <small style={{ display: "block" }}>Demo store with sample items</small>}
          </div>
        </div>
        {p.bio && <p style={{ margin: 0 }}>{p.bio}</p>}

        <div className="stats">
          <Link href={`${base}?tab=followers`}>
            <b className="num">{stats.follower_count.toLocaleString()}</b>Followers
          </Link>
          <Link href={`${base}?tab=following`}>
            <b className="num">{stats.following_count.toLocaleString()}</b>Following
          </Link>
          <Link href={`${base}?tab=listings`}>
            <b className="num">{stats.listing_count.toLocaleString()}</b>Listings
          </Link>
        </div>

        <div className="two">
          <div className="rate">
            <small>As a seller</small>
            <b>New</b>
            <small>No reviews from buyers yet</small>
          </div>
          <div className="rate">
            <small>As a buyer</small>
            <b>New</b>
            <small>No reviews from sellers yet</small>
          </div>
        </div>

        {me ? (
          <>
            <div className="two">
              <Link href="/settings" className="btn ghost">Edit profile</Link>
              <Link href="/sell" className="btn">Sell an item</Link>
            </div>
            <form action={signOut}>
              <button className="link" type="submit">Sign out</button>
            </form>
          </>
        ) : (
          <div className="two">
            <FollowButton profileId={p.id} name={p.full_name} initial={isFollowing} signedIn={!!viewer?.profile} />
            <ComingSoonButton className="btn ghost" needsSignIn={!viewer?.profile} message="Messaging is coming soon. Chats will stay inside the app.">
              Message
            </ComingSoonButton>
          </div>
        )}

        <nav className="ptabs" aria-label="Profile sections">
          {TABS.map(([k, l]) => (
            <Link key={k} href={`${base}?tab=${k}`} aria-current={tab === k ? "page" : undefined} scroll={false}>
              {l}
            </Link>
          ))}
        </nav>
        <div className="pbody">{body}</div>
      </div>
    </main>
  );
}
