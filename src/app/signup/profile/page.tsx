import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { getViewer } from "@/lib/data";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Set up your profile" };

export default async function ProfileSetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const viewer = await getViewer();
  if (!viewer) redirect(`/signup?next=${encodeURIComponent(next)}`);
  if (viewer.profile) redirect(next);

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Create your profile</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <div className="steps" aria-label="Step 2 of 2">
          <span className="on" />
          <span className="on" />
        </div>
        <h2>Set up your profile</h2>
        <p className="sample" style={{ fontSize: 14 }}>
          This is what buyers and sellers see. You can change it any time in Settings.
        </p>
        <ProfileForm mode="create" next={next} />
      </div>
    </main>
  );
}
