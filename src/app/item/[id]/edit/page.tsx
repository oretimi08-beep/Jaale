import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/components/ListingForm";
import { getListing, getViewer } from "@/lib/data";

export const metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=/item/${id}/edit`);
  const listing = await getListing(id);
  if (!listing) notFound();
  if (listing.seller_id !== viewer.userId) redirect(`/item/${id}`);

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Edit listing</strong>
          <Link href={`/item/${id}`} className="x" aria-label="Back to listing">×</Link>
        </div>
        <ListingForm listing={listing} defaultCity={viewer.profile.city} />
      </div>
    </main>
  );
}
