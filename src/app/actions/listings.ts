"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data";
import { getCategory, isBulky } from "@/lib/catalog";
import { CITIES, MAX_PHOTOS } from "@/lib/config";
import { nairaInputToKobo } from "@/lib/money";
import type { FormState } from "@/lib/safe-next";
import type { ListingStatus } from "@/lib/types";

type Photo = { path: string; url: string };

function readPhotos(raw: FormDataEntryValue | null, userId: string): Photo[] {
  try {
    const list = JSON.parse(String(raw ?? "[]")) as Photo[];
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`;
    return list
      .filter((p) => typeof p.path === "string" && p.path.startsWith(`${userId}/`) && p.url === base + p.path)
      .slice(0, MAX_PHOTOS);
  } catch {
    return [];
  }
}

function readListingForm(form: FormData) {
  const category = String(form.get("category") ?? "");
  const bulky = isBulky(category);
  const sizeOrDims = String(form.get("size") ?? "").trim();
  const was = nairaInputToKobo(String(form.get("was_price") ?? ""));
  return {
    title: String(form.get("title") ?? "").trim().replace(/\s+/g, " "),
    description: String(form.get("description") ?? "").trim() || null,
    category,
    department: getCategory(category)?.dept,
    condition: form.get("condition") === "new_with_tags" ? "new_with_tags" : "pre_owned",
    brand: String(form.get("brand") ?? "").trim() || null,
    size: bulky ? null : sizeOrDims || null,
    dimensions: bulky ? sizeOrDims || null : null,
    tested_working: getCategory(category)?.dept === "appliances" && form.get("tested_working") === "on",
    price_kobo: nairaInputToKobo(String(form.get("price") ?? "")),
    was_price_kobo: was > 0 ? was : null,
    city: String(form.get("city") ?? ""),
    area: String(form.get("area") ?? "").trim() || null,
  };
}

function validate(l: ReturnType<typeof readListingForm>): string | null {
  if (l.title.length < 3) return "Add a title (at least 3 characters).";
  if (l.title.length > 80) return "Keep the title under 80 characters.";
  if (!l.department) return "Choose a category.";
  if (l.price_kobo < 500_00) return "The lowest price is ₦500.";
  if (l.price_kobo > 50_000_000_00) return "That price is too high.";
  if (l.was_price_kobo && l.was_price_kobo <= l.price_kobo) return "The original price should be higher than your price.";
  if (!CITIES.includes(l.city)) return "Choose the city the item is in.";
  if ((l.description ?? "").length > 2000) return "Keep the description under 2,000 characters.";
  return null;
}

function formFields(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  });
  return out;
}

export async function createListing(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login?next=/sell");
  const l = readListingForm(form);
  const photos = readPhotos(form.get("photos"), viewer.userId);
  const problem = validate(l) ?? (photos.length ? null : "Add at least one photo so buyers can see the item.");
  if (problem) return { error: problem, fields: formFields(form) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...l, seller_id: viewer.userId })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Couldn't save your listing.", fields: formFields(form) };

  await supabase.from("listing_photos").insert(photos.map((p, i) => ({ listing_id: data.id, url: p.url, path: p.path, position: i })));
  revalidatePath("/", "layout");
  redirect(`/item/${data.id}?posted=1`);
}

export async function updateListing(id: string, _: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=/item/${id}/edit`);
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("listings")
    .select("id, seller_id, photos:listing_photos(path)")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.seller_id !== viewer.userId) return { error: "You can only edit your own listings." };

  const l = readListingForm(form);
  const photos = readPhotos(form.get("photos"), viewer.userId);
  const problem = validate(l) ?? (photos.length ? null : "Keep at least one photo.");
  if (problem) return { error: problem, fields: formFields(form) };

  const { error } = await supabase.from("listings").update(l).eq("id", id);
  if (error) return { error: error.message, fields: formFields(form) };

  // Replace the photo list, then delete files that are no longer used.
  await supabase.from("listing_photos").delete().eq("listing_id", id);
  await supabase.from("listing_photos").insert(photos.map((p, i) => ({ listing_id: id, url: p.url, path: p.path, position: i })));
  const keep = new Set(photos.map((p) => p.path));
  const gone = ((existing.photos ?? []) as { path: string }[]).map((p) => p.path).filter((p) => !keep.has(p));
  if (gone.length) await supabase.storage.from("listing-photos").remove(gone);

  revalidatePath("/", "layout");
  redirect(`/item/${id}?saved=1`);
}

export async function setListingStatus(id: string, status: Exclude<ListingStatus, "removed">) {
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "signin" };
  if (!["active", "reserved", "sold"].includes(status)) return { error: "Unknown status" };
  const supabase = await createClient();
  const { error } = await supabase.from("listings").update({ status }).eq("id", id).eq("seller_id", viewer.userId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteListing(id: string) {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");
  const supabase = await createClient();
  const { data: photos } = await supabase.from("listing_photos").select("path").eq("listing_id", id);
  const { error } = await supabase.from("listings").delete().eq("id", id).eq("seller_id", viewer.userId);
  if (error) return { error: error.message };
  const paths = (photos ?? []).map((p) => p.path as string);
  if (paths.length) await supabase.storage.from("listing-photos").remove(paths);
  revalidatePath("/", "layout");
  redirect(`/u/${viewer.profile.username}?removed=1`);
}
