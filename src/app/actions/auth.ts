"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data";
import { safeNext, siteUrl, type FormState } from "@/lib/safe-next";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Check them and try again.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "There's already an account with this email. Sign in instead.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("email rate limit"))
    return "We're getting lots of sign-ups right now and can't send another email yet. Please try again in about an hour.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a few minutes and try again.";
  if (m.includes("password should")) return "Choose a stronger password: at least 8 characters.";
  if (m.includes("same") && m.includes("password")) return "Your new password must be different from the old one.";
  return message;
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));
  const fields = { email };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address.", fields };
  if (password.length < 8) return { error: "Your password needs at least 8 characters.", fields };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/signup/profile?next=" + next)}` },
  });
  if (error) return { error: friendly(error.message), fields };
  if (!data.session) {
    return { ok: "Almost there! We sent you an email. Tap the link in it to confirm, then set up your profile.", fields };
  }
  redirect(`/signup/profile?next=${encodeURIComponent(next)}`);
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));
  const fields = { email };
  if (!email || !password) return { error: "Enter your email and password.", fields };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message), fields };
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?signedout=1");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter the email you signed up with.", fields: { email } };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/settings/new-password`,
  });
  if (error) return { error: friendly(error.message), fields: { email } };
  return { ok: "If that email has an account, a reset link is on its way. Check your inbox (and spam)." };
}

/** Change password while signed in: confirms the current password first. */
export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.email) redirect("/login?next=/settings");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 8) return { error: "Your new password needs at least 8 characters." };
  if (next !== confirm) return { error: "The two new passwords don't match." };

  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: viewer.email, password: current });
  if (check.error) return { error: "Your current password isn't right." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: friendly(error.message) };
  return { ok: "Password changed. Use your new password next time you sign in." };
}

/** Set a new password after following the reset link in an email. */
export async function setNewPassword(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "This reset link has expired. Ask for a new one." };
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 8) return { error: "Your new password needs at least 8 characters." };
  if (next !== confirm) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: friendly(error.message) };
  redirect("/settings?changed=1");
}
