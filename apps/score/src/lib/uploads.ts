import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_CLUB_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_PLAYER_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_PROFILE_AVATAR_BYTES = 1 * 1024 * 1024;

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export function validateImageFile(file: File, maxBytes: number): void {
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("Only PNG, JPEG, and WebP images are allowed.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Image must be ${Math.round(maxBytes / (1024 * 1024))}MB or smaller.`);
  }
}

export async function uploadClubLogo(
  supabase: SupabaseClient,
  clubId: string,
  file: File
): Promise<string> {
  validateImageFile(file, MAX_CLUB_LOGO_BYTES);
  const objectPath = `${clubId}/${crypto.randomUUID()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from("club-logos").upload(objectPath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("club-logos").getPublicUrl(objectPath).data.publicUrl;
}

export async function uploadPlayerAvatar(
  supabase: SupabaseClient,
  playerId: string,
  file: File
): Promise<string> {
  validateImageFile(file, MAX_PLAYER_AVATAR_BYTES);
  const objectPath = `${playerId}/${crypto.randomUUID()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from("player-avatars").upload(objectPath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("player-avatars").getPublicUrl(objectPath).data.publicUrl;
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  validateImageFile(file, MAX_PROFILE_AVATAR_BYTES);
  const objectPath = `${userId}/${crypto.randomUUID()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from("avatars").upload(objectPath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("avatars").getPublicUrl(objectPath).data.publicUrl;
}
