import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/AuthForms";
import { ProfileForm } from "@/components/ProfileForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut } from "@/app/actions/auth";
import { getViewer } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PayoutForm } from "@/components/PayoutForm";
import { maskAccount } from "@/lib/bank";
import { listBanks, paystackReady, type Bank } from "@/lib/paystack";
import { BRAND } from "@/lib/config";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/settings");
  if (!viewer.profile) redirect("/signup/profile?next=/settings");
  const p = viewer.profile;
  const supabase = await createClient();
  const [{ data: priv }, { data: payout }] = await Promise.all([
    supabase.from("profile_private").select("phone").eq("id", p.id).maybeSingle(),
    supabase.from("payout_accounts").select("bank_name, account_number, account_name, verified_at").eq("user_id", p.id).maybeSingle(),
  ]);
  let banks: Bank[] = [];
  if (paystackReady()) banks = await listBanks().catch(() => []);

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Settings</strong>
          <Link href={`/u/${p.username}`} className="x" aria-label="Back to my profile">×</Link>
        </div>

        <h2>Your profile</h2>
        <ProfileForm
          mode="edit"
          initial={{
            full_name: p.full_name,
            username: p.username,
            city: p.city,
            goal: p.goal,
            bio: p.bio,
            avatar_url: p.avatar_url,
            phone: (priv?.phone as string) ?? null,
          }}
        />

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />
        <h2 id="bank">Get paid</h2>
        <p className="sample" style={{ fontSize: 14 }}>
          When an order completes, we send the item price to this account. It must be in your own name, and only you and
          the {BRAND.name} team can see it.
        </p>
        {payout ? (
          <div className="note">
            <b>✓ {payout.bank_name} {maskAccount(payout.account_number as string)}</b>
            <br />
            {payout.account_name}
          </div>
        ) : (
          <div className="note warm">
            <b>No bank account yet.</b> Add one so you can be paid when you sell something.
          </div>
        )}
        {banks.length ? (
          <PayoutForm banks={banks} hasAccount={!!payout} />
        ) : (
          <p className="sample">Bank details can&apos;t be added right now. Please try again later.</p>
        )}

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />
        <h2 id="password">Change password</h2>
        <p className="sample" style={{ fontSize: 14 }}>Signed in as {viewer.email}</p>
        <ChangePasswordForm />

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />
        <h2>Display</h2>
        <ThemeToggle />

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />
        <form action={signOut}>
          <button className="btn danger block" type="submit">Sign out</button>
        </form>
      </div>
    </main>
  );
}
