import type { SupabaseClient } from "@supabase/supabase-js";
import { AVATAR_OUTPUT_MAX_BYTES } from "@/lib/avatar-image";

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

const AVATAR_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Uploads to the public `covers` bucket and returns the public URL. */
export async function uploadCover(
  supabase: SupabaseClient,
  file: File,
  folder: "articles" | "editions" | "ads"
): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from("covers").upload(path, file);
  if (error) throw new Error(error.message);
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

/** Uploads a cropped profile photo to the public `avatars` bucket. */
export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (!AVATAR_MIME.has(file.type)) {
    throw new Error("Use a PNG, JPEG, or WebP image.");
  }
  if (file.size > AVATAR_OUTPUT_MAX_BYTES) {
    throw new Error(
      "Couldn't shrink this crop enough. Zoom in a bit or try a simpler photo."
    );
  }
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(objectPath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("avatars").getPublicUrl(objectPath).data.publicUrl;
}

/** Uploads an edition PDF to the PRIVATE bucket and returns the storage path. */
export async function uploadEditionPdf(
  supabase: SupabaseClient,
  editionId: string,
  file: File
): Promise<string> {
  const path = `${editionId}/edition.pdf`;
  const { error } = await supabase.storage
    .from("editions")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (error) throw new Error(error.message);
  return path;
}
