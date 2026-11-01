import Link from "next/link";
import { redirect } from "next/navigation";
import { ItemCard } from "@/components/ItemCard";
import { getViewer, LISTING_SELECT } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

export const metadata = { title: "Saved items" };

export default async function SavedPage() {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login?next=/saved&why=save");
  const supabase = await createClient();
  const { data } = await supabase
    .from("saves")
    .select(`created_at, listing:listings(${LISTING_SELECT})`)
    .eq("user_id", viewer.userId)
    .order("created_at", { ascending: false });
  const items = (data ?? [])
    .map((r) => (r as unknown as { listing: Listing | null }).listing)
    .filter((l): l is Listing => !!l && l.status !== "removed")
    .map((l) => ({ ...l, photos: [...l.photos].sort((a, b) => a.position - b.position) }));

  return (
    <main className="wrap">
      <section className="blk">
        <div className="sh">
          <div>
            <h2>Saved items</h2>
            <p>{items.length} item{items.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="grid">
          {items.length ? (
            items.map((it) => <ItemCard key={it.id} item={it} saved />)
          ) : (
            <p className="empty">
              Nothing saved yet. Tap the heart on any item to keep it here. <Link href="/" className="link">Start shopping</Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
