"use client";

import { newId } from "@/lib/ids";
import { getBrowserClient } from "@/lib/supabase/client";

export const MAX_EDGE = 1600;
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export type UploadedPhoto = { path: string; width: number; height: number };

/** Redraws the photo at most 1600px on its longest side as a JPEG (EXIF rotation applied). */
export async function resizeToJpeg(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot process images.");
    ctx.fillStyle = "#ffffff"; // PNG transparency becomes white instead of black
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("Could not prepare that photo.");
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return `${file.name}: use a JPG, PNG or WebP photo.`;
  if (file.size > MAX_INPUT_BYTES) return `${file.name}: photos must be under 15 MB.`;
  return null;
}

/** Resize, then upload into the seller's own folder: {sellerId}/{productId}/{uuid}.jpg */
export async function uploadProductPhoto(file: File, sellerId: string, productId: string): Promise<UploadedPhoto> {
  const { blob, width, height } = await resizeToJpeg(file);
  const path = `${sellerId}/${productId}/${newId()}.jpg`;
  const supabase = getBrowserClient();
  const { error } = await supabase.storage.from("product-images").upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Upload failed.");
  return { path, width, height };
}
