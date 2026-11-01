"use client";

import imageCompression from "browser-image-compression";
import { createClient } from "./supabase/client";

/**
 * Shrinks a photo on the phone before uploading, so pages stay fast on mobile data,
 * then stores it in the person's own folder in Supabase Storage.
 */
export async function uploadImage(
  file: File,
  bucket: "listing-photos" | "avatars",
  opts: { maxSide: number; maxMB: number },
): Promise<{ path: string; url: string }> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't a photo.");
  const small = await imageCompression(file, {
    maxSizeMB: opts.maxMB,
    maxWidthOrHeight: opts.maxSide,
    fileType: "image/jpeg",
    initialQuality: 0.82,
    useWebWorker: true,
  });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in again.");

  const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, small, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}
