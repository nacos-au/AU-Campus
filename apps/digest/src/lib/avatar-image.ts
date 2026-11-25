/** Client-side crop + compress for profile avatars (small UI only). */

export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp";
export const AVATAR_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_OUTPUT_MAX_BYTES = 1024 * 1024;

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export type AvatarCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AvatarExportResult = {
  blob: Blob;
  file: File;
  qualityReduced: boolean;
};

export function validateAvatarSource(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Use a PNG, JPEG, or WebP image.";
  }
  if (file.size > AVATAR_SOURCE_MAX_BYTES) {
    return "That file is too large to open in the browser. Try a photo under 20MB.";
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image. Try another file."));
    img.src = src;
  });
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not process that image. Try another photo."));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * Crop to a square and export WebP (JPEG fallback) at 512px.
 * Starts at high quality and steps down only to stay under the storage limit.
 */
export async function exportAvatarCrop(
  imageSrc: string,
  crop: AvatarCropArea
): Promise<AvatarExportResult> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image. Try another photo.");

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE
  );

  const preferWebp =
    typeof document !== "undefined" &&
    canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const mime = preferWebp ? "image/webp" : "image/jpeg";
  const ext = preferWebp ? "webp" : "jpg";
  const qualities = [0.82, 0.74, 0.65];

  let blob: Blob | null = null;
  let qualityReduced = false;

  for (let i = 0; i < qualities.length; i++) {
    blob = await canvasToBlob(canvas, mime, qualities[i]);
    if (blob.size <= AVATAR_OUTPUT_MAX_BYTES) {
      qualityReduced = i > 0;
      break;
    }
  }

  if (!blob || blob.size > AVATAR_OUTPUT_MAX_BYTES) {
    throw new Error(
      "Couldn't shrink this crop enough. Zoom in a bit or try a simpler photo."
    );
  }

  const file = new File([blob], `avatar.${ext}`, { type: mime });
  return { blob, file, qualityReduced };
}
