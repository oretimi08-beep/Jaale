"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data";
import { CITIES } from "@/lib/config";
import { safeNext, type FormState } from "@/lib/safe-next";

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** Only accept photo links that point at this user's own folder in our storage. */
function ownPublicUrl(url: string, bucket: string, userId: string): string | null {
  if (!url) return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${userId}/`;
  return url.startsWith(base) ? url : null;
}

function normalisePhone(raw: string): string | null | "invalid" {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("234")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  return /^[789][01]\d{8}$/.test(local) ? `+234${local}` : "invalid";
}

function readProfileForm(form: FormData) {
  return {
    full_name: String(form.get("full_name") ?? "").trim().replace(/\s+/g, " "),
    username: String(form.get("username") ?? "").trim().replace(/^@/, "").toLowerCase(),
    city: String(form.get("city") ?? ""),
    goal: form.get("goal") === "mostly_buy" ? "mostly_buy" : "buy_and_sell",
    bio: String(form.get("bio") ?? "").trim(),
    phone: String(form.get("phone") ?? ""),
    avatar_url: String(form.get("avatar_url") ?? ""),
  };
}

function validate(p: ReturnType<typeof readProfileForm>): string | null {
  if (p.full_name.length < 2) return "Add your full name.";
  if (p.full_name.length > 60) return "That name is too long.";
  if (!USERNAME_RE.test(p.username)) return "Usernames are 3 to 20 characters: letters, numbers, _ or . only.";
  if (!CITIES.includes(p.city)) return "Choose your city.";
  if (p.bio.length > 300) return "Keep your bio under 300 characters.";
  return null;
}

async function usernameTaken(supabase: Awaited<ReturnType<typeof createClient>>, username: string, myId: string) {
  const { data } = await supabase.from("profiles").select("id").ilike("username", username).neq("id", myId).limit(1);
  return !!data?.length;
}

export async function createProfile(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signup");
  const next = safeNext(form.get("next"));
  const p = readProfileForm(form);
  const fields = { ...p, terms: form.get("terms") === "on" ? "on" : "" };
  const problem = validate(p);
  if (problem) return { error: problem, fields };
  if (form.get("terms") !== "on") return { error: "Tick the box to accept the terms.", fields };
  const phone = normalisePhone(p.phone);
  if (phone === "invalid") return { error: "That doesn't look like a Nigerian phone number, e.g. 803 123 4567.", fields };

  const supabase = await createClient();
  if (await usernameTaken(supabase, p.username, viewer.userId)) {
    return { error: `@${p.username} is taken. Try another username.`, fields };
  }
  const { error } = await supabase.from("profiles").upsert({
    id: viewer.userId,
    full_name: p.full_name,
    username: p.username,
    city: p.city,
    goal: p.goal,
    avatar_url: ownPublicUrl(p.avatar_url, "avatars", viewer.userId),
    terms_accepted_at: new Date().toISOString(),
  });
  if (error) return { error: error.message.includes("duplicate") ? "That username is taken." : error.message, fields };
  if (phone) await supabase.from("profile_private").upsert({ id: viewer.userId, phone });

  revalidatePath("/", "layout");
  redirect(next === "/" ? "/?welcome=1" : next);
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login?next=/settings");
  const p = readProfileForm(form);
  const fields = { ...p };
  const problem = validate(p);
  if (problem) return { error: problem, fields };
  const phone = normalisePhone(p.phone);
  if (phone === "invalid") return { error: "That doesn't look like a Nigerian phone number, e.g. 803 123 4567.", fields };

  const supabase = await createClient();
  if (await usernameTaken(supabase, p.username, viewer.userId)) {
    return { error: `@${p.username} is taken. Try another username.`, fields };
  }
  const avatar = p.avatar_url === "" ? null : ownPublicUrl(p.avatar_url, "avatars", viewer.userId) ?? viewer.profile.avatar_url;
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: p.full_name, username: p.username, city: p.city, goal: p.goal, bio: p.bio || null, avatar_url: avatar })
    .eq("id", viewer.userId);
  if (error) return { error: error.message, fields };
  await supabase.from("profile_private").upsert({ id: viewer.userId, phone });

  revalidatePath("/", "layout");
  return { ok: "Profile saved.", fields };
}

export async function toggleFollow(profileId: string, path: string): Promise<{ following?: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "signin" };
  if (profileId === viewer.userId) return { error: "You can't follow yourself." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewer.userId)
    .eq("following_id", profileId)
    .maybeSingle();
  if (existing) {
    await supabase.from("follows").delete().eq("follower_id", viewer.userId).eq("following_id", profileId);
  } else {
    const { error } = await supabase.from("follows").insert({ follower_id: viewer.userId, following_id: profileId });
    if (error) return { error: error.message };
  }
  revalidatePath(safeNext(path));
  return { following: !existing };
}

export async function toggleSave(listingId: string): Promise<{ saved?: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "signin" };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saves")
    .select("listing_id")
    .eq("user_id", viewer.userId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) {
    await supabase.from("saves").delete().eq("user_id", viewer.userId).eq("listing_id", listingId);
  } else {
    const { error } = await supabase.from("saves").insert({ user_id: viewer.userId, listing_id: listingId });
    if (error) return { error: error.message };
  }
  revalidatePath("/", "layout");
  return { saved: !existing };
}
