import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Chat, type ChatMessage } from "@/components/Chat";
import { ListingPic } from "@/components/ListingPic";
import { markRead } from "@/app/actions/messages";
import { getListing, getViewer } from "@/lib/data";
import { naira } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chat" };

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offer?: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=/messages/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: c } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  await markRead(id);

  const role = c.buyer_id === viewer.userId ? "buyer" : "seller";
  const [listing, { data: other }, { data: msgs }] = await Promise.all([
    getListing(c.listing_id),
    supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", role === "buyer" ? c.seller_id : c.buyer_id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, body, flagged, offer_kobo, offer_status, created_at")
      .eq("conversation_id", id)
      .order("created_at")
      .limit(300),
  ]);
  const messages = (msgs ?? []) as ChatMessage[];
  const accepted = [...messages].reverse().find((m) => m.offer_status === "accepted");

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>
            {other ? <Link href={`/u/${other.username}`} className="link">{other.full_name}</Link> : "Chat"}
          </strong>
          <Link href="/messages" className="x" aria-label="Back to messages">×</Link>
        </div>

        {listing && (
          <Link href={`/item/${listing.id}`} className="seller">
            <ListingPic listing={listing} style={{ width: 56, aspectRatio: "1/1", borderRadius: 10, flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{listing.title}</b>
              <small>
                {naira(listing.price_kobo)}
                {listing.status !== "active" ? ` · ${listing.status === "sold" ? "Sold" : listing.status === "reserved" ? "Reserved" : "No longer listed"}` : ""}
              </small>
            </div>
          </Link>
        )}

        {accepted && listing?.status === "active" && (
          <div className="note">
            <b>Offer accepted: {naira(accepted.offer_kobo!)}.</b>{" "}
            {role === "buyer" ? (
              <>
                The first person to pay gets the item.{" "}
                <Link href={`/checkout/${listing.id}`} className="link">Buy now for {naira(accepted.offer_kobo!)}</Link>
              </>
            ) : (
              "The buyer can now pay this price. The first person to pay gets the item."
            )}
          </div>
        )}

        <Chat
          conversationId={id}
          me={viewer.userId}
          role={role}
          messages={messages}
          askingKobo={listing?.price_kobo ?? 0}
          canOffer={listing?.status === "active"}
          startWithOffer={(await searchParams).offer === "1" && role === "buyer"}
        />
      </div>
    </main>
  );
}
