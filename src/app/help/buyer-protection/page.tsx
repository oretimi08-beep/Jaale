import Link from "next/link";
import { BRAND } from "@/lib/config";

export const metadata = { title: "Buyer protection" };

export default function BuyerProtectionPage() {
  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Help</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <h2>Buyer protection</h2>
        <p style={{ margin: 0 }}>
          When you buy on {BRAND.name}, we hold your money until the item is in your hands and it&apos;s as described. The
          seller is not paid until then.
        </p>
        <div className="lines">
          <div className="line"><span>Buyer protection fee</span><b>₦300 + 5% of the item price</b></div>
          <div className="line"><span>Time to check your item</span><b>2 days after delivery</b></div>
          <div className="line"><span>Selling fee</span><b>Free</b></div>
        </div>
        <h2 id="delivery" style={{ fontSize: 18 }}>Delivery and returns</h2>
        <p style={{ margin: 0 }}>
          Parcels go by dispatch rider, courier or pickup point. Furniture and appliances go by van, or you can pick them
          up yourself and still pay safely in the app. If something is wrong, tap &quot;Report a problem&quot; within 2 days
          and the seller&apos;s payout is frozen while our team looks into it.
        </p>
        <h2 id="safety" style={{ fontSize: 18 }}>Safety tips</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          <li>Always pay inside the app. Never send money to a seller&apos;s bank account directly.</li>
          <li>Keep chats in the app, so we can help if something goes wrong.</li>
          <li>For appliances, plug them in and test them before confirming.</li>
        </ul>
        <p className="sample">Payments run in Paystack test mode during the preview, so no real money moves.</p>
      </div>
    </main>
  );
}
