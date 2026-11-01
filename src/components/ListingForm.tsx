"use client";

import { useActionState, useState } from "react";
import { createListing, updateListing } from "@/app/actions/listings";
import { CATEGORIES, DEPARTMENTS, getCategory, isBulky } from "@/lib/catalog";
import { CITIES, MAX_PHOTOS } from "@/lib/config";
import { naira, nairaInputToKobo } from "@/lib/money";
import { uploadImage } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";
import type { Listing } from "@/lib/types";
import { Message, Submit } from "./AuthForms";

type Photo = { path: string; url: string; fresh?: boolean };

export function ListingForm({ listing, defaultCity }: { listing?: Listing; defaultCity: string }) {
  const action = listing ? updateListing.bind(null, listing.id) : createListing;
  const [state, formAction, pending] = useActionState(action, undefined);
  const f = state?.fields ?? {};

  const [photos, setPhotos] = useState<Photo[]>(listing?.photos.map((p) => ({ path: p.path, url: p.url })) ?? []);
  const [busy, setBusy] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [category, setCategory] = useState(f.category ?? listing?.category ?? "dresses");
  const [price, setPrice] = useState(f.price ?? (listing ? String(listing.price_kobo / 100) : ""));
  const bulky = isBulky(category);
  const appliance = getCategory(category)?.dept === "appliances";

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = MAX_PHOTOS - photos.length - busy;
    if (files.length > room) setPhotoError(`You can add up to ${MAX_PHOTOS} photos.`);
    else setPhotoError(null);
    for (const file of files.slice(0, Math.max(room, 0))) {
      setBusy((b) => b + 1);
      try {
        const up = await uploadImage(file, "listing-photos", { maxSide: 1600, maxMB: 0.45 });
        setPhotos((p) => [...p, { ...up, fresh: true }]);
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : "A photo didn't upload. Try again.");
      } finally {
        setBusy((b) => b - 1);
      }
    }
  }

  function removePhoto(i: number) {
    const p = photos[i];
    setPhotos((list) => list.filter((_, n) => n !== i));
    // Photos uploaded just now and not saved yet can be deleted straight away.
    if (p.fresh) createClient().storage.from("listing-photos").remove([p.path]);
  }

  function move(i: number, by: number) {
    setPhotos((list) => {
      const j = i + by;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const sizeValue = f.size ?? (listing ? (isBulky(listing.category) ? listing.dimensions : listing.size) ?? "" : "");

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <input type="hidden" name="photos" value={JSON.stringify(photos.map(({ path, url }) => ({ path, url })))} />
      <Message state={state} />

      <div style={{ display: "grid", gap: 8 }}>
        <b>Photos</b>
        <div className="photo-grid">
          {photos.map((p, i) => (
            <div className="ph" key={p.path}>
              <img src={p.url} alt={`Photo ${i + 1}`} />
              {i === 0 && <span className="cover">COVER</span>}
              <button type="button" className="rm" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)}>×</button>
              {photos.length > 1 && (
                <div className="mv">
                  {i > 0 && <button type="button" aria-label="Move earlier" onClick={() => move(i, -1)}>‹</button>}
                  {i < photos.length - 1 && <button type="button" aria-label="Move later" onClick={() => move(i, 1)}>›</button>}
                </div>
              )}
            </div>
          ))}
          {Array.from({ length: busy }).map((_, i) => (
            <div className="ph" key={`busy${i}`} style={{ display: "grid", placeItems: "center" }}>
              <span className="spinner" aria-label="Uploading" />
            </div>
          ))}
          {photos.length + busy < MAX_PHOTOS && (
            <label className="add">
              + Add photos
              <input type="file" accept="image/*" multiple hidden onChange={addPhotos} />
            </label>
          )}
        </div>
        <span className="sample">
          Up to {MAX_PHOTOS} photos. Natural light works best. For appliances, show it switched on. The first photo is the cover.
        </span>
        {photoError && <div className="note err"><b>Photo problem.</b> {photoError}</div>}
      </div>

      <label className="f">
        Title
        <input name="title" required maxLength={80} placeholder="e.g. 3-seater sofa, or Ankara midi dress" defaultValue={f.title ?? listing?.title} />
      </label>

      <div className="two">
        <label className="f">
          Category
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {DEPARTMENTS.map((d) => (
              <optgroup key={d.key} label={d.label}>
                {CATEGORIES.filter((c) => c.dept === d.key).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="f">
          Condition
          <select name="condition" defaultValue={f.condition ?? listing?.condition ?? "pre_owned"}>
            <option value="new_with_tags">New with tags</option>
            <option value="pre_owned">Pre-owned</option>
          </select>
        </label>
      </div>

      <div className="two">
        <label className="f">
          Brand
          <input name="brand" maxLength={40} placeholder="Zara, LG, handmade…" defaultValue={f.brand ?? listing?.brand ?? ""} />
        </label>
        <label className="f">
          {bulky ? "Dimensions" : "Size"}
          <input name="size" maxLength={bulky ? 40 : 30} placeholder={bulky ? "e.g. 210 × 90 cm" : "UK 12, EU 43, M"} defaultValue={sizeValue} key={bulky ? "dims" : "size"} />
        </label>
      </div>

      {appliance && (
        <label className="opt">
          <input type="checkbox" name="tested_working" defaultChecked={f.tested_working ? f.tested_working === "on" : listing?.tested_working ?? false} />
          <span>
            Tested and working
            <small>Tick only if you&apos;ve switched it on recently and it works properly.</small>
          </span>
        </label>
      )}

      <label className="f">
        Description <span className="hint">Optional. Flaws, measurements, why you&apos;re selling.</span>
        <textarea name="description" rows={4} maxLength={2000} defaultValue={f.description ?? listing?.description ?? ""} />
      </label>

      <div className="two">
        <label className="f">
          City
          <select name="city" defaultValue={f.city ?? listing?.city ?? defaultCity}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="f">
          Area
          <input name="area" maxLength={40} placeholder="e.g. Yaba" defaultValue={f.area ?? listing?.area ?? ""} />
        </label>
      </div>

      <div className="two">
        <label className="f">
          Price (₦)
          <input name="price" inputMode="numeric" required placeholder="15000" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="f">
          Original price (₦) <span className="hint">Optional, shows a discount</span>
          <input name="was_price" inputMode="numeric" placeholder="25000" defaultValue={f.was_price ?? (listing?.was_price_kobo ? String(listing.was_price_kobo / 100) : "")} />
        </label>
      </div>

      <div className="lines">
        <div className="line">
          <span>You receive</span>
          <span className="num"><b>{naira(nairaInputToKobo(price))}</b></span>
        </div>
        <small className="muted">Selling is free. The buyer pays the protection fee and delivery.</small>
      </div>

      <Submit pending={pending || busy > 0}>{busy > 0 ? "Uploading photos…" : listing ? "Save changes" : "Post listing"}</Submit>
    </form>
  );
}
