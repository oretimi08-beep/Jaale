import Link from "next/link";
import { redirect } from "next/navigation";
import { ListingForm } from "@/components/ListingForm";
import { BankReminder } from "@/components/BankReminder";
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
        <BankReminder userId={viewer.userId} text="You can list now, but we need it to pay you when your item sells." />
        <ListingForm defaultCity={viewer.profile.city} />
      </div>
    </main>
  );
}
