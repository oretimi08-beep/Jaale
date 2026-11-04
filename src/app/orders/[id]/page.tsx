import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { naira } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { autoRelease, confirmPayment, type OrderRow } from "@/lib/order-service";
import { createClient } from "@/lib/supabase/server";
import { OrderActions } from "@/components/OrderActions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BankReminder } from "@/components/BankReminder";

export const metadata = { title: "Order" };

function when(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })
    : null;
}

type Step = { title: string; note: string; state: "done" | "now" | "todo" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const read = async () => (await supabase.from("orders").select("*").eq("id", id).maybeSingle()).data as OrderRow | null;
  let order = await read();
  if (!order) notFound();

  // Coming back from Paystack (or just opening an unpaid order): check with Paystack.
  const { paid } = await searchParams;
  let payMessage: string | undefined;
  let stillChecking = false;
  if (order.status === "pending_payment" && order.buyer_id === viewer.userId) {
    const res = await confirmPayment(order.id, { retries: paid ? 3 : 0, justReturned: !!paid });
    payMessage = res.message;
    stillChecking = !!res.stillChecking && !!paid;
    order = (await read())!;
  }
  if (order.status === "delivered") {
    await autoRelease().catch(() => 0);
    order = (await read())!;
  }
  const role = order.buyer_id === viewer.userId ? "buyer" : "seller";
  const { data: other } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", role === "buyer" ? order.seller_id : order.buyer_id)
    .maybeSingle();
  const { data: dispute } = order.status === "disputed"
    ? await supabase.from("disputes").select("reason, details, created_at").eq("order_id", order.id).maybeSingle()
    : { data: null };
  const { data: myReview } =
    order.status === "completed"
      ? await supabase.from("reviews").select("stars, visible_at").eq("order_id", order.id).eq("reviewer_id", viewer.userId).maybeSingle()
      : { data: null };
  const { data: payout } =
    role === "seller" && order.status === "completed"
      ? await supabase.from("payouts").select("status, paid_at").eq("order_id", order.id).maybeSingle()
      : { data: null };
  const payoutNote = !payout
    ? "It will be sent to your bank account."
    : payout.status === "paid"
      ? `Paid to your bank account${payout.paid_at ? ` on ${when(payout.paid_at)}` : ""}.`
      : payout.status === "processing"
        ? "It's on its way to your bank account."
        : "It will be sent to your bank account shortly. Make sure you've added one in Settings.";
  const pickup = order.delivery_method === "self_pickup" || order.delivery_method === "pickup_point";
  const bulky = ["van", "intercity_van", "self_pickup"].includes(order.delivery_method);

  const s = order.status;
  const rank = ["pending_payment", "paid_held", "shipped", "delivered", "completed"].indexOf(s);
  const at = (n: number): Step["state"] => (rank > n ? "done" : rank === n ? "now" : "todo");
  const steps: Step[] = [
    { title: "Payment received and held", note: order.paid_at ? `${when(order.paid_at)} · held by Jaale` : "Waiting for payment", state: rank >= 1 ? "done" : "now" },
    {
      title: pickup ? "Ready for collection" : bulky ? "Van on the way" : "Seller sent your item",
      note: order.shipped_at ? when(order.shipped_at)! : role === "seller" ? "Tap “I've sent it” once it's with the rider" : "The seller is getting it ready",
      state: at(1) === "now" ? "now" : rank >= 2 ? "done" : "todo",
    },
    {
      title: pickup ? "Collected" : "Delivered",
      note: order.delivered_at ? when(order.delivered_at)! : order.delivery_label,
      state: at(2) === "now" ? "now" : rank >= 3 ? "done" : "todo",
    },
    {
      title: "Check your item, 2 days",
      note: order.release_at && s === "delivered" ? `Until ${when(order.release_at)} to confirm or report a problem` : "Confirm or report a problem",
      state: at(3),
    },
    { title: "Seller gets paid", note: order.completed_at ? `${when(order.completed_at)} · ${naira(order.item_kobo)} released` : "Money released to the seller", state: s === "completed" ? "done" : "todo" },
  ];

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Order #{order.number}</strong>
          <Link href={role === "seller" ? "/orders?tab=sales" : "/orders"} className="x" aria-label="Back to orders">×</Link>
        </div>

        {payMessage && <div className="note err"><b>Payment.</b> {payMessage}</div>}
        {stillChecking && order.status === "pending_payment" && (
          <div className="note warm">
            <b>Confirming your payment with Paystack…</b> This usually takes a few seconds.
            <AutoRefresh seconds={4} />
          </div>
        )}
        {paid && s === "paid_held" && role === "buyer" && (
          <div className="note"><b>Payment received.</b> Your money is held safely. {other?.full_name} has been told to send your item.</div>
        )}

        <div className="seller">
          <span className="pic" style={{ width: 64, aspectRatio: "1/1", borderRadius: 10, flex: "none" }}>
            {order.listing_photo_url ? <img src={order.listing_photo_url} alt="" /> : null}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link href={`/item/${order.listing_id}`}><b>{order.listing_title}</b></Link>
            <small>
              {role === "buyer" ? "Seller" : "Buyer"}:{" "}
              {other ? <Link className="link" href={`/u/${other.username}`}>{other.full_name}</Link> : "—"} · {STATUS_LABEL[s]}
            </small>
          </div>
        </div>

        {["paid_held", "shipped", "delivered"].includes(s) && (
          <div className="note">
            <b>{naira(order.item_kobo)} is held safely.</b>{" "}
            {role === "buyer" ? `${other?.full_name ?? "The seller"} gets paid after you confirm the item is fine.` : "You get paid when the buyer confirms, or 2 days after delivery if they don't report a problem."}
          </div>
        )}
        {s === "disputed" && (
          <div className="note warm">
            <b>Problem reported: {dispute?.reason}.</b> The payout is frozen. Our team will contact you both within 48 hours.
            {dispute?.details ? ` “${dispute.details}”` : ""}
          </div>
        )}
        {s === "refunded" && (
          <div className="note warm">
            <b>Refunded.</b> {order.refund_reason}{" "}
            {order.refund_status === "processed" ? "The money is back with the buyer." : order.refund_status === "failed" ? "The refund needs attention from our team." : "Refunds take a few working days to show."}
          </div>
        )}
        {s === "completed" && (
          <div className="note">
            <b>Completed.</b> {role === "seller" ? `${naira(order.item_kobo)} is yours. ${payoutNote}` : "Thanks for buying on Jaale."}
          </div>
        )}
        {s === "completed" &&
          (myReview ? (
            <p className="sample">
              You rated {other?.full_name} {myReview.stars} star{myReview.stars === 1 ? "" : "s"}.{" "}
              {new Date(myReview.visible_at) > new Date() ? "It appears once they've rated you too, or after 7 days." : "Your review is live."}
            </p>
          ) : (
            <Link href={`/orders/${order.id}/review`} className="btn block">
              Rate {other?.full_name ?? (role === "buyer" ? "the seller" : "the buyer")}
            </Link>
          ))}
        {s === "cancelled" && <div className="note warm"><b>Cancelled.</b> No money was taken for this order.</div>}

        {!["refunded", "cancelled"].includes(s) && (
          <div className="track">
            {steps.map((st, i) => (
              <div key={st.title} className={`tk ${st.state === "todo" ? "" : st.state}`}>
                <div className="dot">{st.state === "done" ? "✓" : st.state === "now" ? "•" : i + 1}</div>
                <div><b>{st.title}</b><small>{st.note}</small></div>
              </div>
            ))}
          </div>
        )}

        <OrderActions orderId={order.id} status={s} role={role} pickup={pickup} />

        <div className="lines">
          {role === "buyer" ? (
            <>
              <div className="line"><span>Item</span><span className="num">{naira(order.item_kobo)}</span></div>
              <div className="line"><span>Buyer protection</span><span className="num">{naira(order.protection_fee_kobo)}</span></div>
              <div className="line"><span>{order.delivery_label}</span><span className="num">{order.delivery_kobo ? naira(order.delivery_kobo) : "Free"}</span></div>
              <div className="line total"><span>You paid</span><span className="num">{naira(order.total_kobo)}</span></div>
            </>
          ) : (
            <>
              <div className="line"><span>Item price</span><span className="num">{naira(order.item_kobo)}</span></div>
              <div className="line"><span>Selling fee</span><span className="num">₦0</span></div>
              <div className="line total"><span>You receive</span><span className="num">{naira(order.item_kobo)}</span></div>
            </>
          )}
        </div>

        {role === "seller" && order.paid_at && !["refunded", "cancelled"].includes(s) && (
          <BankReminder userId={viewer.userId} text="We can't send you this money until you add one." />
        )}
        {role === "seller" && order.paid_at && (
          <div className="lines">
            <b>Delivery: {order.delivery_label}</b>
            {order.delivery_address && <span>{order.delivery_address}</span>}
            {order.delivery_phone && <span className="muted">Buyer&apos;s phone: {order.delivery_phone}</span>}
          </div>
        )}
        <p className="sample">Order placed {when(order.created_at)} · Ref {order.paystack_reference}</p>
      </div>
    </main>
  );
}
