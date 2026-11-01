import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReviewForm } from "@/components/ReviewForm";
import { getViewer } from "@/lib/data";
import { BUYER_TAGS, SELLER_TAGS } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Rate your order" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=/orders/${id}/review`);
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id, buyer_id, seller_id, status, listing_title").eq("id", id).maybeSingle();
  if (!order) notFound();
  if (order.status !== "completed") redirect(`/orders/${id}`);
  const { data: mine } = await supabase.from("reviews").select("id").eq("order_id", id).eq("reviewer_id", viewer.userId).maybeSingle();
  if (mine) redirect(`/orders/${id}`);

  const asBuyer = order.buyer_id === viewer.userId;
  const { data: other } = await supabase.from("profiles").select("full_name").eq("id", asBuyer ? order.seller_id : order.buyer_id).maybeSingle();
  const name = other?.full_name ?? (asBuyer ? "the seller" : "the buyer");

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Rate your order</strong>
          <Link href={`/orders/${id}`} className="x" aria-label="Back to order">×</Link>
        </div>
        <p className="sample" style={{ fontSize: 14 }}>{order.listing_title}</p>
        <h2>How was {name} as a {asBuyer ? "seller" : "buyer"}?</h2>
        <ReviewForm orderId={id} tags={asBuyer ? SELLER_TAGS : BUYER_TAGS} placeholder={asBuyer ? "What should other buyers know?" : "What should other sellers know?"} />
        <p className="sample">
          {name} will also rate you as a {asBuyer ? "buyer" : "seller"}. Both reviews appear at the same time, once
          you&apos;ve both rated or after 7 days, so nobody rates in revenge.
        </p>
      </div>
    </main>
  );
}
