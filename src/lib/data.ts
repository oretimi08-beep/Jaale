import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "./supabase/server";
import type { Listing, Profile, ProfileLite, ProfileStats, Ratings, Viewer } from "./types";
import type { DeptKey } from "./catalog";

export const LISTING_SELECT =
  "*, seller:profiles!listings_seller_id_fkey(id, full_name, username, avatar_url, city, is_demo, verified_bank), photos:listing_photos(url, path, position)";

const PROFILE_LITE = "id, full_name, username, avatar_url, city, is_demo, verified_bank";

export function isConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function tidy(rows: unknown[] | null): Listing[] {
  return ((rows ?? []) as Listing[]).map((l) => ({
    ...l,
    photos: [...(l.photos ?? [])].sort((a, b) => a.position - b.position),
  }));
}

/** The signed-in person, checked against Supabase. Null when signed out. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  await connection(); // always per-visitor, never baked into a static page
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  const email = ((claims.email as string) ?? "").toLowerCase() || null;
  // Admins are listed by email in ADMIN_EMAILS. Signing in needs a confirmed email, so nobody can claim one.
  const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
  return {
    userId: claims.sub,
    email,
    profile: (profile as Profile) ?? null,
    isAdmin: !!email && admins.includes(email),
    banned: !!(profile as Profile | null)?.banned_at,
  };
});

/** The signed-in person if they have a profile and aren't suspended; otherwise a reason. */
export async function activeViewer(): Promise<{ viewer: Viewer & { profile: Profile }; error?: undefined } | { viewer?: undefined; error: "signin" | "banned" }> {
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "signin" };
  if (viewer.banned) return { error: "banned" };
  return { viewer: viewer as Viewer & { profile: Profile } };
}

export const BANNED_MESSAGE = "Your account is suspended. Contact Jaale support if you think this is a mistake.";

export async function getRatings(profileId: string): Promise<Ratings> {
  const supabase = await createClient();
  const { data } = await supabase.from("profile_ratings").select("*").eq("id", profileId).maybeSingle();
  return (data as Ratings) ?? { seller_avg: null, seller_count: 0, buyer_avg: null, buyer_count: 0 };
}

/** How many conversations have a message you haven't read yet. */
export async function unreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id, last_message_at, buyer_read_at, seller_read_at")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .limit(200);
  return (data ?? []).filter((c) =>
    c.buyer_id === userId ? c.last_message_at > c.buyer_read_at : c.last_message_at > c.seller_read_at,
  ).length;
}

export const getSavedIds = cache(async (): Promise<Set<string>> => {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saves").select("listing_id").eq("user_id", viewer.userId);
  return new Set((data ?? []).map((r) => r.listing_id as string));
});

export type BrowseOptions = {
  dept?: DeptKey | "following" | null;
  cat?: string | null;
  q?: string | null;
  sort?: string | null;
  limit?: number;
  sellerIds?: string[];
};

export async function browseListings(opts: BrowseOptions): Promise<{ items: Listing[]; total: number }> {
  if (!isConfigured()) return { items: [], total: 0 };
  const supabase = await createClient();
  let query = supabase.from("listings").select(LISTING_SELECT, { count: "exact" }).in("status", ["active", "reserved"]);

  if (opts.dept && opts.dept !== "following") query = query.eq("department", opts.dept);
  if (opts.sellerIds) {
    if (opts.sellerIds.length === 0) return { items: [], total: 0 };
    query = query.in("seller_id", opts.sellerIds);
  }
  if (opts.cat) query = query.eq("category", opts.cat);
  const q = (opts.q ?? "").replace(/[%,()*\\]/g, " ").trim();
  if (q) query = query.or(`title.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`);

  switch (opts.sort) {
    case "low":
      query = query.order("price_kobo", { ascending: true });
      break;
    case "high":
      query = query.order("price_kobo", { ascending: false });
      break;
    case "deal":
      query = query.order("discount_pct", { ascending: false }).order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  const { data, count, error } = await query.limit(opts.limit ?? 20);
  if (error) console.error("browseListings", error.message);
  return { items: tidy(data), total: count ?? 0 };
}

export async function getTrending(limit = 8): Promise<Listing[]> {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .order("save_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return tidy(data);
}

export async function getSpotlight(): Promise<Listing[]> {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .in("department", ["home", "appliances"])
    .order("created_at", { ascending: false })
    .limit(6);
  return tidy(data);
}

export async function getFeaturedStores(): Promise<(ProfileLite & ProfileStats)[]> {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data: stats } = await supabase
    .from("profile_stats")
    .select("*")
    .gt("listing_count", 0)
    .order("listing_count", { ascending: false })
    .limit(10);
  const ids = (stats ?? []).map((s) => s.id as string);
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select(PROFILE_LITE).in("id", ids);
  return ids
    .map((id) => {
      const p = (profiles ?? []).find((x) => x.id === id);
      const s = (stats ?? []).find((x) => x.id === id);
      return p && s ? ({ ...(p as ProfileLite), ...(s as ProfileStats) }) : null;
    })
    .filter((x): x is ProfileLite & ProfileStats => !!x);
}

export async function getListing(id: string): Promise<Listing | null> {
  if (!isConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
  return data ? tidy([data])[0] : null;
}

export async function getProfileByUsername(username: string) {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username.replace(/[%_\\]/g, (c) => "\\" + c))
    .maybeSingle();
  if (!profile) return null;
  const { data: stats } = await supabase.from("profile_stats").select("*").eq("id", profile.id).maybeSingle();
  return {
    profile: profile as Profile,
    stats: (stats as ProfileStats) ?? { follower_count: 0, following_count: 0, listing_count: 0 },
  };
}

export async function getSellerListings(sellerId: string, includeHidden: boolean): Promise<Listing[]> {
  const supabase = await createClient();
  let query = supabase.from("listings").select(LISTING_SELECT).eq("seller_id", sellerId);
  query = includeHidden ? query.neq("status", "removed") : query.in("status", ["active", "reserved", "sold"]);
  const { data } = await query.order("created_at", { ascending: false }).limit(100);
  return tidy(data);
}

export async function getFollowList(profileId: string, which: "followers" | "following") {
  const supabase = await createClient();
  const column = which === "followers" ? "following_id" : "follower_id";
  const other = which === "followers" ? "follower_id" : "following_id";
  const { data } = await supabase.from("follows").select(other).eq(column, profileId).limit(200);
  const ids = (data ?? []).map((r) => (r as Record<string, string>)[other]);
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select(PROFILE_LITE).in("id", ids);
  return (profiles ?? []) as ProfileLite[];
}

export const getFollowingIds = cache(async (): Promise<Set<string>> => {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", viewer.userId);
  return new Set((data ?? []).map((r) => r.following_id as string));
});
