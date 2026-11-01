"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { changePassword, requestPasswordReset, setNewPassword, signIn, signUp } from "@/app/actions/auth";
import type { FormState } from "@/lib/safe-next";

export function Message({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <div className="note err" role="alert">
        <b>Hmm.</b> {state.error}
      </div>
    );
  if (state?.ok)
    return (
      <div className="note" role="status">
        <b>Done.</b> {state.ok}
      </div>
    );
  return null;
}

export function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button className="btn block" type="submit" disabled={pending}>
      {pending ? <span className="spinner" aria-label="Working" /> : children}
    </button>
  );
}

function PasswordInput({ name, label, autoComplete, hint }: { name: string; label: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="f">
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        {label}
        <button type="button" className="link" style={{ fontSize: 13 }} onClick={() => setShow((s) => !s)}>
          {show ? "Hide" : "Show"}
        </button>
      </span>
      <input name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={name === "current" ? 1 : 8} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      <Message state={state} />
      <label className="f">
        Email
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </label>
      <PasswordInput name="password" label="Password" autoComplete="current-password" />
      <Link href="/forgot-password" className="link" style={{ justifySelf: "start", fontSize: 14 }}>
        Forgot your password?
      </Link>
      <Submit pending={pending}>Sign in</Submit>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.ok) return <Message state={state} />;
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      <Message state={state} />
      <label className="f">
        Email
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </label>
      <PasswordInput name="password" label="Create a password" autoComplete="new-password" hint="At least 8 characters." />
      <Submit pending={pending}>Continue</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <Message state={state} />
      <label className="f">
        Email
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </label>
      <Submit pending={pending}>Send reset link</Submit>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} style={{ display: "grid", gap: 14 }} key={state?.ok ? "done" : "form"}>
      <Message state={state} />
      <PasswordInput name="current" label="Current password" autoComplete="current-password" />
      <PasswordInput name="password" label="New password" autoComplete="new-password" hint="At least 8 characters." />
      <PasswordInput name="confirm" label="Type the new password again" autoComplete="new-password" />
      <Submit pending={pending}>Change password</Submit>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <Message state={state} />
      <PasswordInput name="password" label="New password" autoComplete="new-password" hint="At least 8 characters." />
      <PasswordInput name="confirm" label="Type it again" autoComplete="new-password" />
      <Submit pending={pending}>Save new password</Submit>
    </form>
  );
}
