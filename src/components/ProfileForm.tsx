"use client";

import { useActionState, useState } from "react";
import { createProfile, updateProfile } from "@/app/actions/profile";
import { CITIES } from "@/lib/config";
import { uploadImage } from "@/lib/upload";
import { Avatar } from "./Avatar";
import { Message, Submit } from "./AuthForms";

type Initial = {
  full_name?: string;
  username?: string;
  city?: string;
  goal?: string;
  bio?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

export function ProfileForm({ mode, next, initial = {} }: { mode: "create" | "edit"; next?: string; initial?: Initial }) {
  const [state, action, pending] = useActionState(mode === "create" ? createProfile : updateProfile, undefined);
  const v = { ...initial, ...(state?.fields ?? {}) } as Initial;
  const [avatar, setAvatar] = useState<string>(initial.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [name, setName] = useState(v.full_name ?? "");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await uploadImage(file, "avatars", { maxSide: 512, maxMB: 0.2 });
      setAvatar(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const phoneLocal = (v.phone ?? "").replace(/^\+234/, "");

  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="avatar_url" value={avatar} />
      <Message state={state} />

      <div className="phead">
        <Avatar name={name || "+"} url={avatar || null} seed={v.username || "new"} className="xl" />
        <div style={{ display: "grid", gap: 6 }}>
          <label className="btn ghost sm" style={{ cursor: "pointer" }}>
            {uploading ? "Uploading…" : avatar ? "Change photo" : "Add a profile photo"}
            <input type="file" accept="image/*" onChange={pick} hidden disabled={uploading} />
          </label>
          {avatar && (
            <button type="button" className="link" style={{ fontSize: 13, justifySelf: "start" }} onClick={() => setAvatar("")}>
              Remove photo
            </button>
          )}
          <span className="sample">Optional. A clear face or shop logo builds trust.</span>
        </div>
      </div>
      {uploadError && <div className="note err"><b>Photo problem.</b> {uploadError}</div>}

      <label className="f">
        Full name
        <input name="full_name" required placeholder="e.g. Timi Ore" defaultValue={v.full_name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <div className="two">
        <label className="f">
          Username
          <input name="username" required placeholder="timi_closet" defaultValue={v.username} autoCapitalize="none" autoComplete="username" />
        </label>
        <label className="f">
          City
          <select name="city" defaultValue={v.city ?? "Lagos"}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="f">
        Phone number <span className="hint">Optional for now. Kept private, never shown on your profile.</span>
        <div className="phone">
          <span>🇳🇬 +234</span>
          <input name="phone" inputMode="tel" placeholder="803 123 4567" defaultValue={phoneLocal} autoComplete="tel-national" />
        </div>
      </label>
      {mode === "edit" && (
        <label className="f">
          About you <span className="hint">Optional. What you sell, how fast you reply, where you meet.</span>
          <textarea name="bio" rows={3} maxLength={300} defaultValue={v.bio ?? ""} />
        </label>
      )}
      <fieldset>
        <legend>I&apos;m here to</legend>
        <div className="two">
          <label className="opt">
            <input type="radio" name="goal" value="buy_and_sell" defaultChecked={(v.goal ?? "buy_and_sell") === "buy_and_sell"} />
            <span>Buy and sell</span>
          </label>
          <label className="opt">
            <input type="radio" name="goal" value="mostly_buy" defaultChecked={v.goal === "mostly_buy"} />
            <span>Mostly buy</span>
          </label>
        </div>
      </fieldset>
      {mode === "create" && (
        <label className="opt">
          <input type="checkbox" name="terms" required />
          <span>
            <small>I agree to the terms, the buyer protection rules, and to keep payments and chats inside the app.</small>
          </span>
        </label>
      )}
      <Submit pending={pending || uploading}>{mode === "create" ? "Create profile" : "Save profile"}</Submit>
    </form>
  );
}
