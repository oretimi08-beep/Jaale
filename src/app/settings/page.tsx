import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/AuthForms";
import { ProfileForm } from "@/components/ProfileForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut } from "@/app/actions/auth";
import { getViewer } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/settings");
  if (!viewer.profile) redirect("/signup/profile?next=/settings");
  const p = viewer.profile;
  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("phone").eq("id", p.id).maybeSingle();

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
