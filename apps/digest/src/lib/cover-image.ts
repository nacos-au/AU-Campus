/** Client-side 16:9 crop + compress for article cover / share art. */

export const COVER_ACCEPT = "image/png,image/jpeg,image/webp";
export const COVER_SOURCE_MAX_BYTES = 25 * 1024 * 1024;
export const COVER_OUTPUT_WIDTH = 1600;
export const COVER_OUTPUT_HEIGHT = 900;
export const COVER_OUTPUT_MAX_BYTES = 2 * 1024 * 1024;
export const COVER_ASPECT = 16 / 9;

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export type CoverCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CoverExportResult = {
  blob: Blob;
  file: File;
  qualityReduced: boolean;
};

export function validateCoverSource(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Use a PNG, JPEG, or WebP image.";
  }
  if (file.size > COVER_SOURCE_MAX_BYTES) {
    return "That file is too large to open in the browser. Try a photo under 25MB.";
  }
  return null;
}

function loadImage(src: string, crossOrigin?: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          crossOrigin
            ? "Could not re-crop this cover. Choose the photo again."
            : "Could not read that image. Try another file."
        )
      );
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
        if (!blob)
          reject(new Error("Could not process that image. Try another photo."));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * Crop to 16:9 and export WebP (JPEG fallback) at 1600×900.
 * Steps quality down only to stay under the size cap.
 */
export async function exportCoverCrop(
  imageSrc: string,
  crop: CoverCropArea,
  opts?: { crossOrigin?: boolean }
): Promise<CoverExportResult> {
  const img = await loadImage(imageSrc, opts?.crossOrigin);
  const canvas = document.createElement("canvas");
  canvas.width = COVER_OUTPUT_WIDTH;
  canvas.height = COVER_OUTPUT_HEIGHT;
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
    COVER_OUTPUT_WIDTH,
    COVER_OUTPUT_HEIGHT
  );

  const preferWebp =
    typeof document !== "undefined" &&
    canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const mime = preferWebp ? "image/webp" : "image/jpeg";
  const ext = preferWebp ? "webp" : "jpg";
  const qualities = [0.85, 0.76, 0.68, 0.6];

  let blob: Blob | null = null;
  let qualityReduced = false;

  for (let i = 0; i < qualities.length; i++) {
    blob = await canvasToBlob(canvas, mime, qualities[i]);
    if (blob.size <= COVER_OUTPUT_MAX_BYTES) {
      qualityReduced = i > 0;
      break;
    }
  }

  if (!blob || blob.size > COVER_OUTPUT_MAX_BYTES) {
    throw new Error(
      "Couldn't shrink this crop enough. Zoom in a bit or try a simpler photo."
    );
  }

  const file = new File([blob], `cover.${ext}`, { type: mime });
  return { blob, file, qualityReduced };
}
