import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/data";
import { naira } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { BanButton, DisputeDecision, PayoutPaidButton, RemoveListingButton } from "@/components/AdminActions";

export const metadata = { title: "Admin" };

const TABS = [
  ["disputes", "Problems"],
  ["payouts", "Payouts"],
  ["users", "Users"],
  ["listings", "Listings"],
  ["orders", "Orders"],
  ["chats", "Flagged chats"],
] as const;

function when(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound(); // non-admins don't even learn this page exists
  const sp = await searchParams;
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? "disputes";
  const q = (sp.q ?? "").replace(/[%,()*\\]/g, " ").trim();
  const db = createAdminClient();

  const [{ count: openDisputes }, { count: pendingPayouts }, { count: users }, { count: live }, { count: flagged }] = await Promise.all([
    db.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", false),
    db.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("messages").select("id", { count: "exact", head: true }).eq("flagged", true),
  ]);

  let body: React.ReactNode = null;

  if (tab === "disputes") {
    const { data } = await db
      .from("disputes")
      .select("id, reason, details, status, resolution, created_at, order:orders(id, number, listing_title, total_kobo, item_kobo, buyer:profiles!orders_buyer_id_fkey(full_name, username), seller:profiles!orders_seller_id_fkey(full_name, username))")
      .order("created_at", { ascending: false })
      .limit(50);
    type D = { id: string; reason: string; details: string | null; status: string; resolution: string | null; created_at: string; order: { id: string; number: number; listing_title: string; total_kobo: number; item_kobo: number; buyer: { full_name: string; username: string }; seller: { full_name: string; username: string } } };
    const rows = (data ?? []) as unknown as D[];
    body = rows.length ? rows.map((d) => (
      <div key={d.id} className="lines">
        <div className="line"><b>#{d.order.number} · {d.order.listing_title}</b><span className="bd">{d.status === "open" ? "OPEN" : d.status === "resolved_refund" ? "REFUNDED" : "RELEASED"}</span></div>
        <small className="muted">
          Buyer <Link className="link" href={`/u/${d.order.buyer.username}`}>{d.order.buyer.full_name}</Link> · Seller{" "}
          <Link className="link" href={`/u/${d.order.seller.username}`}>{d.order.seller.full_name}</Link> · {when(d.created_at)}
        </small>
        <span><b>{d.reason}.</b> {d.details}</span>
        {d.status === "open" ? (
          <DisputeDecision orderId={d.order.id} refundLabel={`Refund buyer ${naira(d.order.total_kobo)}`} releaseLabel={`Pay seller ${naira(d.order.item_kobo)}`} />
        ) : (
          d.resolution && <small className="muted">Note: {d.resolution}</small>
        )}
      </div>
    )) : <p className="empty">No problems reported.</p>;
  }

  if (tab === "payouts") {
    const { data } = await db
      .from("payouts")
      .select("id, seller_id, amount_kobo, status, created_at, order:orders(number, listing_title), seller:profiles(full_name, username)")
      .order("status", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    type P = { id: string; seller_id: string; amount_kobo: number; status: string; created_at: string; order: { number: number; listing_title: string }; seller: { full_name: string; username: string } };
    const rows = (data ?? []) as unknown as P[];
    const { data: accounts } = rows.length
      ? await db.from("payout_accounts").select("user_id, bank_name, account_number, account_name").in("user_id", [...new Set(rows.map((r) => r.seller_id))])
      : { data: [] };
    const bankOf = (id: string) => (accounts ?? []).find((a) => a.user_id === id);
    body = rows.length ? (
      <>
        <p className="sample">Bank transfers aren&apos;t automatic yet. Pay the seller yourself, then mark it paid here.</p>
        {rows.map((p) => (
          <div key={p.id} className="seller">
            <div style={{ flex: 1, minWidth: 0 }}>
              <b className="num">{naira(p.amount_kobo)}</b> to <Link className="link" href={`/u/${p.seller.username}`}>{p.seller.full_name}</Link>
              <small>#{p.order.number} · {p.order.listing_title} · {when(p.created_at)}</small>
              {p.status === "pending" &&
                (bankOf(p.seller_id) ? (
                  <small style={{ color: "var(--fg)" }}>
                    Pay to: <b>{bankOf(p.seller_id)!.bank_name} · {bankOf(p.seller_id)!.account_number}</b> · {bankOf(p.seller_id)!.account_name}
                  </small>
                ) : (
                  <small style={{ color: "var(--danger)" }}>No bank account yet. Ask the seller to add one in Settings.</small>
                ))}
            </div>
            {p.status === "pending" ? <PayoutPaidButton payoutId={p.id} /> : <span className="bd newt">PAID</span>}
          </div>
        ))}
      </>
    ) : <p className="empty">No payouts yet.</p>;
  }

  if (tab === "users") {
    let query = db.from("profiles").select("id, full_name, username, city, created_at, banned_at, banned_reason, is_demo").order("created_at", { ascending: false }).limit(100);
    if (q) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
    const { data } = await query;
    body = (
      <>
        <form className="search"><input name="q" defaultValue={q} placeholder="Search name or username" /><input type="hidden" name="tab" value="users" /></form>
        {(data ?? []).map((u) => (
          <div key={u.id} className="seller">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/u/${u.username}`}><b>{u.full_name}</b></Link>
              <small>@{u.username} · {u.city} · joined {when(u.created_at)}{u.is_demo ? " · demo" : ""}{u.banned_at ? ` · SUSPENDED${u.banned_reason ? `: ${u.banned_reason}` : ""}` : ""}</small>
            </div>
            {u.id !== viewer.userId && <BanButton profileId={u.id} banned={!!u.banned_at} name={u.full_name} />}
          </div>
        ))}
      </>
    );
  }

  if (tab === "listings") {
    let query = db.from("listings").select("id, title, price_kobo, status, created_at, seller:profiles(full_name, username)").neq("status", "removed").order("created_at", { ascending: false }).limit(100);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data } = await query;
    type L = { id: string; title: string; price_kobo: number; status: string; created_at: string; seller: { full_name: string; username: string } };
    body = (
      <>
        <form className="search"><input name="q" defaultValue={q} placeholder="Search titles" /><input type="hidden" name="tab" value="listings" /></form>
        {((data ?? []) as unknown as L[]).map((l) => (
          <div key={l.id} className="seller">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/item/${l.id}`}><b>{l.title}</b></Link>
              <small>{naira(l.price_kobo)} · {l.status} · by {l.seller.full_name} · {when(l.created_at)}</small>
            </div>
            <RemoveListingButton listingId={l.id} />
          </div>
        ))}
      </>
    );
  }

  if (tab === "orders") {
    const { data } = await db.from("orders").select("id, number, listing_title, total_kobo, status, created_at, refund_status").order("created_at", { ascending: false }).limit(100);
    body = (data ?? []).map((o) => (
      <div key={o.id} className="seller">
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>#{o.number} · {o.listing_title}</b>
          <small>{STATUS_LABEL[o.status as OrderStatus]}{o.refund_status ? ` · refund ${o.refund_status}` : ""} · {when(o.created_at)}</small>
        </div>
        <b className="num">{naira(o.total_kobo)}</b>
      </div>
    ));
  }

  if (tab === "chats") {
    const { data } = await db
      .from("messages")
      .select("id, body, created_at, conversation_id, sender:profiles(full_name, username)")
      .eq("flagged", true)
      .order("created_at", { ascending: false })
      .limit(100);
    type M = { id: string; body: string; created_at: string; sender: { full_name: string; username: string } };
    body = (data ?? []).length ? ((data ?? []) as unknown as M[]).map((m) => (
      <div key={m.id} className="lines">
        <small className="muted"><Link className="link" href={`/u/${m.sender.username}`}>{m.sender.full_name}</Link> · {when(m.created_at)}</small>
        <span>{m.body}</span>
      </div>
    )) : <p className="empty">No flagged messages.</p>;
  }

  return (
    <main className="wrap">
      <div className="panel wide">
        <div className="shead">
          <strong>Jaale admin</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <div className="stats" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          <Link href="/admin?tab=disputes"><b className="num" style={{ color: openDisputes ? "var(--danger)" : undefined }}>{openDisputes ?? 0}</b>Open problems</Link>
          <Link href="/admin?tab=payouts"><b className="num">{pendingPayouts ?? 0}</b>Payouts due</Link>
          <Link href="/admin?tab=users"><b className="num">{users ?? 0}</b>Members</Link>
          <Link href="/admin?tab=listings"><b className="num">{live ?? 0}</b>Live items</Link>
          <Link href="/admin?tab=chats"><b className="num">{flagged ?? 0}</b>Flagged chats</Link>
        </div>
        <nav className="ptabs" aria-label="Admin sections">
          {TABS.map(([k, l]) => (
            <Link key={k} href={`/admin?tab=${k}`} aria-current={tab === k ? "page" : undefined}>{l}</Link>
          ))}
        </nav>
        <div className="pbody">{body}</div>
      </div>
    </main>
  );
}
