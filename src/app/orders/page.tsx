import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { naira } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { autoRelease, type OrderRow } from "@/lib/order-service";
import { createClient } from "@/lib/supabase/server";
import { BankReminder } from "@/components/BankReminder";
import { PushNudge } from "@/components/Push";
import { pushReady } from "@/lib/push";

export const metadata = { title: "My orders" };

const NEEDS_SELLER = new Set(["paid_held", "shipped"]);
const NEEDS_BUYER = new Set(["pending_payment", "shipped", "delivered"]);

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login?next=/orders&why=orders");
  const tab = (await searchParams).tab === "sales" ? "sales" : "purchases";

  await autoRelease().catch(() => 0); // keep 2-day releases on time between the daily runs
  const supabase = await createClient();
  let query = supabase.from("orders").select("*").eq(tab === "sales" ? "seller_id" : "buyer_id", viewer.userId);
  // Sellers only see orders that were actually paid for.
  if (tab === "sales") query = query.not("paid_at", "is", null);
  const { data } = await query.order("created_at", { ascending: false }).limit(100);
  const orders = (data ?? []) as OrderRow[];
  const waiting = tab === "sales" ? NEEDS_SELLER : NEEDS_BUYER;

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>My orders</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <PushNudge ready={pushReady()} />
        <nav className="ptabs" aria-label="Order type">
          <Link href="/orders" aria-current={tab === "purchases" ? "page" : undefined}>Buying</Link>
          <Link href="/orders?tab=sales" aria-current={tab === "sales" ? "page" : undefined}>Selling</Link>
        </nav>
        {tab === "sales" && <BankReminder userId={viewer.userId} text="We need it to send you the money from your sales." />}
        <div className="pbody">
          {orders.length ? (
            orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="seller">
                <span className="pic" style={{ width: 56, aspectRatio: "1/1", borderRadius: 10, flex: "none" }}>
                  {o.listing_photo_url ? <img src={o.listing_photo_url} alt="" /> : null}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.listing_title}</b>
                  <small>
                    #{o.number} · {STATUS_LABEL[o.status]}
                    {waiting.has(o.status) && <span style={{ color: "var(--danger)", fontWeight: 700 }}> · needs you</span>}
                  </small>
                </div>
                <b className="num">{naira(tab === "sales" ? o.item_kobo : o.total_kobo)}</b>
              </Link>
            ))
          ) : (
            <p className="empty">
              {tab === "sales" ? (
                "No sales yet. When someone buys your item, it shows up here."
              ) : (
                <>
                  No orders yet. <Link href="/" className="link">Start shopping</Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
