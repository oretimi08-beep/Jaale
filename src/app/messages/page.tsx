import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { getViewer } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/config";
import { PushNudge } from "@/components/Push";
import { pushReady } from "@/lib/push";

export const metadata = { title: "Messages" };

type Row = {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  buyer_read_at: string;
  seller_read_at: string;
  listing: { id: string; title: string; listing_photos: { url: string; position: number }[] } | null;
  buyer: { full_name: string; username: string; avatar_url: string | null } | null;
  seller: { full_name: string; username: string; avatar_url: string | null } | null;
};

export default async function MessagesPage() {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login?next=/messages");
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, seller_id, last_message_at, buyer_read_at, seller_read_at, listing:listings(id, title, listing_photos(url, position)), buyer:profiles!conversations_buyer_id_fkey(full_name, username, avatar_url), seller:profiles!conversations_seller_id_fkey(full_name, username, avatar_url)",
    )
    .or(`buyer_id.eq.${viewer.userId},seller_id.eq.${viewer.userId}`)
    .order("last_message_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Messages</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <PushNudge ready={pushReady()} />
        <div className="note">
          <b>Chats stay in the app.</b> Never pay a seller directly or move to WhatsApp. Payments made outside {BRAND.name}{" "}
          aren&apos;t protected.
        </div>
        <div className="pbody">
          {rows.length ? (
            rows.map((c) => {
              const iAmBuyer = c.buyer_id === viewer.userId;
              const other = iAmBuyer ? c.seller : c.buyer;
              const unread = c.last_message_at > (iAmBuyer ? c.buyer_read_at : c.seller_read_at);
              const photo = c.listing?.listing_photos?.sort((a, b) => a.position - b.position)[0]?.url;
              return (
                <Link key={c.id} href={`/messages/${c.id}`} className="seller">
                  <Avatar name={other?.full_name ?? "?"} url={other?.avatar_url} seed={other?.username} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>
                      {other?.full_name}
                      {unread && <span className="bd off" style={{ marginLeft: 6 }}>NEW</span>}
                    </b>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {iAmBuyer ? "Buying" : "Selling"}: {c.listing?.title ?? "Removed item"}
                    </small>
                  </div>
                  {photo && (
                    <span className="pic" style={{ width: 44, aspectRatio: "1/1", borderRadius: 8, flex: "none" }}>
                      <img src={photo} alt="" />
                    </span>
                  )}
                </Link>
              );
            })
          ) : (
            <p className="empty">
              No messages yet. Tap &quot;Make an offer&quot; or &quot;Ask a question&quot; on any item to start a chat.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
