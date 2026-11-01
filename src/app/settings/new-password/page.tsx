import Link from "next/link";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/AuthForms";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Choose a new password" };

export default async function NewPasswordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/forgot-password");
  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>New password</strong>
          <Link href="/" className="x" aria-label="Close">×</Link>
        </div>
        <h2>Choose a new password</h2>
        <p className="sample" style={{ fontSize: 14 }}>For {viewer.email}</p>
        <NewPasswordForm />
      </div>
    </main>
  );
}
