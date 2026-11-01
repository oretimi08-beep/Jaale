import Link from "next/link";
import { redirect } from "next/navigation";
import { Art } from "@/components/Art";
import { Avatar } from "@/components/Avatar";
import { ItemCard } from "@/components/ItemCard";
import { ListingPic } from "@/components/ListingPic";
import { SortSelect } from "@/components/SortSelect";
import { CATEGORIES, DEPARTMENTS, HOME_CATEGORY_RAIL, deptLabel, getCategory, type DeptKey } from "@/lib/catalog";
import {
  browseListings,
  getFeaturedStores,
  getFollowingIds,
  getSavedIds,
  getSpotlight,
  getTrending,
  getViewer,
  isConfigured,
} from "@/lib/data";
import { naira } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { ProfileLite } from "@/lib/types";

const PAGE = 20;

type Search = { dept?: string; cat?: string; q?: string; sort?: string; n?: string };

function hrefWith(base: Search, change: Partial<Search>) {
  const next = { ...base, ...change };
  const qs = new URLSearchParams();
  (Object.keys(next) as (keyof Search)[]).forEach((k) => {
    const v = next[k];
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `/?${s}` : "/";
}

async function findSellers(q: string): Promise<ProfileLite[]> {
  const term = q.replace(/[%,()*\\]/g, " ").trim();
  if (!term) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, city")
    .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
    .limit(8);
  return (data ?? []) as ProfileLite[];
}

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const deptKey = DEPARTMENTS.some((d) => d.key === sp.dept) || sp.dept === "following" ? sp.dept! : "all";
  const cat = getCategory(sp.cat)?.slug ?? null;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const sort = ["new", "low", "high", "deal"].includes(sp.sort ?? "") ? sp.sort! : "new";
  const shown = Math.min(Math.max(Number(sp.n) || PAGE, PAGE), 200);

  const viewer = await getViewer();
  if (deptKey === "following" && !viewer?.profile) redirect("/login?next=/?dept=following&why=following");

  const followingIds = deptKey === "following" ? [...(await getFollowingIds())] : undefined;
  const filtered = deptKey !== "all" || !!cat || !!q;

  const [{ items, total }, saved, trending, spotlight, stores, sellers] = await Promise.all([
    browseListings({
      dept: deptKey === "all" ? null : (deptKey as DeptKey | "following"),
      cat,
      q,
      sort,
      limit: shown,
      sellerIds: followingIds,
    }),
    getSavedIds(),
    filtered ? Promise.resolve([]) : getTrending(),
    filtered ? Promise.resolve([]) : getSpotlight(),
    filtered ? Promise.resolve([]) : getFeaturedStores(),
    q ? findSellers(q) : Promise.resolve([]),
  ]);

  const railCats =
    deptKey === "all" || deptKey === "following"
      ? HOME_CATEGORY_RAIL.map((s) => getCategory(s)!).filter(Boolean)
      : CATEGORIES.filter((c) => c.dept === deptKey);

  const heading = q
    ? `Results for “${q}”`
    : cat
      ? getCategory(cat)!.name
      : deptKey === "all"
        ? "Explore"
        : deptKey === "following"
          ? "From people you follow"
          : deptLabel(deptKey);
  const base: Search = { dept: deptKey === "all" ? undefined : deptKey, cat: cat ?? undefined, q: q || undefined, sort: sort === "new" ? undefined : sort };

  return (
    <>
      {!filtered && (
        <section className="hero">
          <div className="wrap">
            <div>
              <h1>
                Pre-loved fashion and home, <em>no wahala.</em>
              </h1>
              <p>
                Buy and sell clothes, furniture and appliances across Nigeria. Your money stays protected until the item
                is in your hands, and selling is free.
              </p>
              <div className="cta">
                <Link href="/sell" className="btn">
                  List an item, it&apos;s free
                </Link>
                <a href="#shop" className="btn ghost">
                  Start shopping
                </a>
              </div>
            </div>
            <div className="promise" aria-label="How buyer protection works">
              <h3>How your money stays safe</h3>
              <div className="step">
                <b>1</b>
                <span>You pay by card, transfer or USSD. We hold the money; the seller doesn&apos;t get it yet.</span>
              </div>
              <div className="step">
                <b>2</b>
                <span>The seller ships with a rider or van we book. You track it in the app.</span>
              </div>
              <div className="step">
                <b>3</b>
                <span>You have 2 days to check it. All good, the seller gets paid. A problem, you get a refund.</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="wrap" id="shop">
        {!isConfigured() && (
          <div className="note warm" style={{ marginTop: 20 }}>
            <b>Database not connected yet.</b> Add the Supabase keys to <code>.env.local</code> to see real listings.
          </div>
        )}

        <section className="blk">
          <div className="sh">
            <div>
              <h2>{deptKey === "all" || deptKey === "following" ? "Shop by category" : deptLabel(deptKey)}</h2>
            </div>
            {cat && (
              <Link className="link" href={hrefWith(base, { cat: undefined })}>
                Clear filter
              </Link>
            )}
          </div>
          <div className="rail">
            {railCats.map((c) => (
              <Link
                key={c.slug}
                className="cat"
                aria-current={cat === c.slug ? "true" : undefined}
                href={hrefWith({ ...base, dept: deptKey === "all" || deptKey === "following" ? c.dept : deptKey }, { cat: cat === c.slug ? undefined : c.slug, n: undefined })}
              >
                <span className="ci">
                  <Art icon={c.icon} color="currentColor" />
                </span>
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        {!filtered && stores.length > 0 && (
          <section className="blk">
            <div className="sh">
              <div>
                <h2>Featured stores</h2>
                <p>Sellers with the most items right now</p>
              </div>
            </div>
            <div className="rail">
              {stores.map((s) => (
                <Link key={s.id} href={`/u/${s.username}`} className="store">
                  <Avatar name={s.full_name} url={s.avatar_url} seed={s.username} />
                  <span>
                    {s.full_name}
                    {s.verified_bank && <span className="tick">✓</span>}
                    <small>{s.listing_count} item{s.listing_count === 1 ? "" : "s"} · {s.follower_count} follower{s.follower_count === 1 ? "" : "s"}</small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!filtered && trending.length > 0 && (
          <section className="blk">
            <div className="sh">
              <div>
                <h2>Trending</h2>
                <p>Most saved right now</p>
              </div>
            </div>
            <div className="rail trend">
              {trending.map((it) => (
                <ItemCard key={it.id} item={it} saved={saved.has(it.id)} />
              ))}
            </div>
          </section>
        )}

        {!filtered && (
          <div className="spot">
            <div>
              <h2>Now selling: home and appliances</h2>
              <p>
                Moving house, upgrading, or relocating abroad? Sell the sofa, the fridge and the standing fan in the same
                place you sell your clothes.
              </p>
              <ul>
                <li>Van delivery booked for bulky items</li>
                <li>Appliances marked &quot;tested and working&quot; by the seller</li>
                <li>2 days to plug it in and check before the seller is paid</li>
              </ul>
              <Link href="/?dept=home" className="btn">
                Shop home &amp; furniture
              </Link>
            </div>
            <div className="tiles">
              {spotlight.map((it) => (
                <Link key={it.id} href={`/item/${it.id}`} aria-label={it.title}>
                  <ListingPic listing={it} className="tile">
                    <span className="num">{naira(it.price_kobo)}</span>
                  </ListingPic>
                </Link>
              ))}
            </div>
          </div>
        )}

        {sellers.length > 0 && (
          <section className="blk">
            <div className="sh">
              <div>
                <h2>Sellers</h2>
              </div>
            </div>
            <div className="rail">
              {sellers.map((s) => (
                <Link key={s.id} href={`/u/${s.username}`} className="store">
                  <Avatar name={s.full_name} url={s.avatar_url} seed={s.username} />
                  <span>
                    {s.full_name}
                    <small>@{s.username}</small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="blk">
          <div className="sh">
            <div>
              <h2>{heading}</h2>
              <p>{filtered ? `${total} item${total === 1 ? "" : "s"}` : "Newest from sellers across Nigeria"}</p>
            </div>
            <SortSelect value={sort} />
          </div>
          <div className="grid">
            {items.length ? (
              items.map((it) => <ItemCard key={it.id} item={it} saved={saved.has(it.id)} />)
            ) : (
              <p className="empty">
                {deptKey === "following"
                  ? "Nothing here yet. Follow sellers from their profile to see their new listings here."
                  : "Nothing here yet. Try another search or category."}
              </p>
            )}
          </div>
          {total > items.length && (
            <div className="more">
              <Link className="btn ghost" href={hrefWith(base, { n: String(shown + PAGE) })} scroll={false}>
                Load more
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
