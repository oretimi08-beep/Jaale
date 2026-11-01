import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login?next=/orders&why=orders");

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>My orders</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <p className="empty" style={{ padding: "16px 0" }}>
          No orders yet. Buying switches on once payments are connected.
        </p>

        <h2 style={{ fontSize: 18 }}>How order tracking will work</h2>
        <p className="sample">A sample order, so you can see the steps.</p>
        <div className="note">
          <b>₦240,000 is held safely.</b> The seller gets paid after you confirm the item is fine.
        </div>
        <div className="track">
          <div className="tk done">
            <div className="dot">✓</div>
            <div><b>Payment received</b><small>Today, 9:14 am · held by us</small></div>
          </div>
          <div className="tk done">
            <div className="dot">✓</div>
            <div><b>Seller packed your item</b><small>Today, 11:02 am</small></div>
          </div>
          <div className="tk now">
            <div className="dot">•</div>
            <div><b>Rider or van on the way</b><small>Picked up from the seller · arriving 3–5 pm</small></div>
          </div>
          <div className="tk">
            <div className="dot">4</div>
            <div><b>Check your item</b><small>You have 2 days to confirm or report a problem</small></div>
          </div>
          <div className="tk">
            <div className="dot">5</div>
            <div><b>Seller gets paid</b><small>Money released to their bank</small></div>
          </div>
        </div>
        <div className="two">
          <button className="btn ghost" disabled>Report a problem</button>
          <button className="btn" disabled>Item received, all good</button>
        </div>
      </div>
    </main>
  );
}
