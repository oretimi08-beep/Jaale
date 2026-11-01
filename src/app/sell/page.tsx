import Link from "next/link";
import { redirect } from "next/navigation";
import { ListingForm } from "@/components/ListingForm";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Sell an item" };

export default async function SellPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/sell&why=sell");
  if (!viewer.profile) redirect("/signup/profile?next=/sell");

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Sell an item</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <ListingForm defaultCity={viewer.profile.city} />
      </div>
    </main>
  );
}
