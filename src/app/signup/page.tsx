import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/AuthForms";
import { getViewer } from "@/lib/data";
import { safeNext } from "@/lib/safe-next";
import { WHY } from "@/lib/why";

export const metadata = { title: "Create your profile" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; why?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const viewer = await getViewer();
  if (viewer?.profile) redirect(next);
  if (viewer) redirect(`/signup/profile?next=${encodeURIComponent(next)}`);

  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Create your profile</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <div className="steps" aria-label="Step 1 of 2">
          <span className="on" />
          <span />
        </div>
        <h2>Join to buy and sell</h2>
        <p className="sample" style={{ fontSize: 14 }}>
          {sp.why && WHY[sp.why]
            ? WHY[sp.why]
            : "You need a profile before you can buy, sell, make offers or follow sellers. It keeps everyone accountable."}
        </p>
        <SignUpForm next={next} />
        <p className="sample" style={{ fontSize: 14, textAlign: "center" }}>
          Already have a profile?{" "}
          <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
