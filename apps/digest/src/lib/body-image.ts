import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadCover } from "@/lib/uploads";

export const BODY_IMAGE_MAX_WIDTH = 1280;
const SKIP_UNDER_BYTES = 400 * 1024;
const WEBP_QUALITY = 0.75;
const JPEG_QUALITY = 0.8;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks a photo before it goes into an article body: at most 1280px wide,
 * WebP (JPEG fallback) at quality 0.75. Small files, GIFs and images that do
 * not get meaningfully smaller are returned untouched.
 */
export async function shrinkBodyImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size < SKIP_UNDER_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, BODY_IMAGE_MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    let blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      // Browser cannot encode WebP: JPEG over a white background instead.
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
      ext = "jpg";
    }
    if (!blob || blob.size >= file.size * 0.95) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/** Shrinks a body photo, then uploads it to the public `covers` bucket. */
export async function uploadBodyImage(
  supabase: SupabaseClient,
  file: File,
  nameHint?: string | null
): Promise<string> {
  const small = await shrinkBodyImage(file);
  return uploadCover(supabase, small, "articles", nameHint);
}
