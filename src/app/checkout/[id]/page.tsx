import { notFound, redirect } from "next/navigation";
import { getListing, getViewer } from "@/lib/data";
import { isBulky } from "@/lib/catalog";
import { isTestMode, paystackReady } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=/checkout/${id}&why=buy`);
  const item = await getListing(id);
  if (!item) notFound();
  if (item.seller_id === viewer.userId || item.status !== "active") redirect(`/item/${id}`);

  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("phone").eq("id", viewer.userId).maybeSingle();

  return (
    <main className="wrap">
      <CheckoutForm
        item={item}
        bulky={isBulky(item.category)}
        testMode={isTestMode()}
        ready={paystackReady()}
        defaultPhone={((priv?.phone as string) ?? "").replace(/^\+234/, "")}
      />
    </main>
  );
}
