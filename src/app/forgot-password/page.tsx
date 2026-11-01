import Link from "next/link";
import { ForgotForm } from "@/components/AuthForms";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <main className="wrap">
      <div className="panel">
        <div className="shead">
          <strong>Reset password</strong>
          <Link href="/login" className="x" aria-label="Back to sign in">×</Link>
        </div>
        <h2>Forgot your password?</h2>
        <p className="sample" style={{ fontSize: 14 }}>
          Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
        </p>
        <ForgotForm />
        <Link href="/login" className="link" style={{ justifySelf: "center" }}>Back to sign in</Link>
      </div>
    </main>
  );
}
