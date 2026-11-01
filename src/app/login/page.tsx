import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/AuthForms";
import { getViewer } from "@/lib/data";
import { safeNext } from "@/lib/safe-next";
import { WHY } from "@/lib/why";
import { BRAND } from "@/lib/config";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; why?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const viewer = await getViewer();
  if (viewer?.profile) redirect(next);
  if (viewer) redirect(`/signup/profile?next=${encodeURIComponent(next)}`);

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Sign in</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <h2>Welcome back to {BRAND.name}</h2>
        {sp.why && WHY[sp.why] && <p className="sample" style={{ fontSize: 14 }}>{WHY[sp.why]}</p>}
        {sp.error === "link" && (
          <div className="note err"><b>That link didn&apos;t work.</b> It may have expired. Try again.</div>
        )}
        <SignInForm next={next} />
        <p className="sample" style={{ fontSize: 14, textAlign: "center" }}>
          New here?{" "}
          <Link className="link" href={`/signup?next=${encodeURIComponent(next)}${sp.why ? `&why=${sp.why}` : ""}`}>
            Create a free profile
          </Link>
        </p>
      </div>
    </main>
  );
}
