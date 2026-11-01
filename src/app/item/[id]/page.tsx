import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { Gallery } from "@/components/Gallery";
import { OwnerControls } from "@/components/OwnerControls";
import { SaveButton } from "@/components/SaveButton";
import { ComingSoonButton } from "@/components/ComingSoonButton";
import { CONDITIONS, getCategory, isBulky, deptLabel } from "@/lib/catalog";
import { getListing, getSavedIds, getViewer } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { naira, totalWithProtection } from "@/lib/money";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getListing((await params).id);
  return item ? { title: item.title } : { title: "Item not found" };
}

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const [item, viewer, saved] = await Promise.all([getListing(id), getViewer(), getSavedIds()]);
  if (!item) notFound();

  const mine = viewer?.userId === item.seller_id;
  const bulky = isBulky(item.category);
  const category = getCategory(item.category);
  const supabase = await createClient();
  const { data: stats } = await supabase.from("profile_stats").select("follower_count").eq("id", item.seller_id).maybeSingle();
  const followers = (stats?.follower_count as number) ?? 0;
  const sold = item.status === "sold";

  return (
    <main className="wrap">
      <div className="panel wide">
        <div className="shead">
          <small className="muted">
            <Link href={`/?dept=${item.department}`} className="link">{deptLabel(item.department)}</Link>
            {" › "}
            <Link href={`/?dept=${item.department}&cat=${item.category}`} className="link">{category?.name}</Link>
          </small>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>

        {mine && <OwnerControls id={item.id} status={item.status} />}

        <div className="item-layout">
          <Gallery listing={item} />

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <h2>{item.title}</h2>
              <div className="big num" style={{ marginTop: 6 }}>
                {naira(item.price_kobo)}
                {item.was_price_kobo ? <s>{naira(item.was_price_kobo)}</s> : null}
              </div>
              <small className="safe">✓ {naira(totalWithProtection(item.price_kobo))} with buyer protection</small>
            </div>

            <div className="tags">
              {item.brand && <span className="tag">{item.brand}</span>}
              {!bulky && item.size && <span className="tag">Size {item.size}</span>}
              {bulky && item.dimensions && <span className="tag">{item.dimensions}</span>}
              <span className="tag">{CONDITIONS[item.condition]}</span>
              <span className="tag">{item.area ? `${item.area}, ` : ""}{item.city}</span>
              {item.tested_working && <span className="tag">Tested and working</span>}
              {item.status !== "active" && <span className="tag" style={{ fontWeight: 700 }}>{sold ? "Sold" : "Reserved"}</span>}
            </div>

            {item.description && <p style={{ margin: 0, whiteSpace: "pre-line" }}>{item.description}</p>}

            {bulky && (
              <div className="note warm">
                <b>Bulky item.</b> Delivered by van within {item.city}. You can also arrange pickup and still pay safely in the app.
              </div>
            )}

            <Link href={`/u/${item.seller.username}`} className="seller">
              <Avatar name={item.seller.full_name} url={item.seller.avatar_url} seed={item.seller.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>
                  {item.seller.full_name}
                  {item.seller.verified_bank && <span className="tick">✓</span>}
                </b>
                <small>
                  @{item.seller.username} · New seller · {followers.toLocaleString()} follower{followers === 1 ? "" : "s"}
                </small>
              </div>
              <span className="muted">›</span>
            </Link>

            <div className="note">
              <b>Protected purchase.</b> We hold your money until you confirm the item arrived as described
              {item.tested_working ? " and works" : ""}.
            </div>

            {!mine && (
              <>
                <div className="two">
                  <ComingSoonButton
                    className="btn ghost"
                    needsSignIn={!viewer?.profile}
                    message="Offers and chat are coming soon. They'll stay inside the app."
                  >
                    Make an offer
                  </ComingSoonButton>
                  {sold ? (
                    <button className="btn" disabled>Sold</button>
                  ) : (
                    <Link
                      className="btn"
                      href={viewer?.profile ? `/checkout/${item.id}` : `/login?next=/checkout/${item.id}&why=buy`}
                    >
                      Buy now
                    </Link>
                  )}
                </div>
                <SaveButton listingId={item.id} title={item.title} initialSaved={saved.has(item.id)} initialCount={item.save_count} big />
              </>
            )}
            <p className="sample">Listed {new Date(item.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
