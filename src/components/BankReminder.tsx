import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** Nudges sellers who haven't added a bank account yet. Shows nothing once they have one. */
export async function BankReminder({ userId, text }: { userId: string; text: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("payout_accounts").select("user_id").eq("user_id", userId).maybeSingle();
  if (data) return null;
  return (
    <div className="note warm">
      <b>Add your bank account.</b> {text}{" "}
      <Link href="/settings#bank" className="link">Add it in Settings</Link>
    </div>
  );
}
