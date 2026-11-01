import { notFound, redirect } from "next/navigation";
import { getListing, getViewer } from "@/lib/data";
import { isBulky } from "@/lib/catalog";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=/checkout/${id}&why=buy`);
  const item = await getListing(id);
  if (!item) notFound();
  if (item.seller_id === viewer.userId || item.status === "sold") redirect(`/item/${id}`);

  return (
    <main className="wrap">
      <CheckoutForm item={item} bulky={isBulky(item.category)} />
    </main>
  );
}
