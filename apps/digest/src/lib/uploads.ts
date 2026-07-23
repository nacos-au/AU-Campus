import type { SupabaseClient } from "@supabase/supabase-js";

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

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
