"use server";

import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { validateUsername } from "@/lib/username";

export type ProfileSettingsState = { ok?: boolean; error?: string } | null;

export async function updateDisplayName(
  _prev: ProfileSettingsState,
  formData: FormData
): Promise<ProfileSettingsState> {
  if (!hasSupabaseConfig()) {
    return { error: "Supabase is not configured." };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const parsed = validateUsername(String(formData.get("username") ?? ""));

  if (!displayName) {
    return { error: "Display name is required." };
  }
  if (displayName.length > 80) {
    return { error: "Display name must be 80 characters or fewer." };
  }
  if (bio.length > 500) {
    return { error: "Bio must be 500 characters or fewer." };
  }
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: clash } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.username)
    .neq("id", user.id)
    .maybeSingle();
  if (clash) return { error: "That username is already taken." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username: parsed.username,
      bio: bio || null,
    })
    .eq("id", user.id);

  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  await supabase.auth.updateUser({
    data: { display_name: displayName, username: parsed.username },
  });

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/settings");
  if (parsed.username) {
    revalidatePath(`/author/${parsed.username}`);
  }
  return { ok: true };
}

export async function updateAvatarUrl(
  avatarUrl: string | null
): Promise<ProfileSettingsState> {
  if (!hasSupabaseConfig()) {
    return { error: "Supabase is not configured." };
  }

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  const role = (me as { role?: string; username?: string | null } | null)?.role;
  if (!role || !["writer", "editor", "admin"].includes(role)) {
    return { error: "Only writers and editors can set a profile photo." };
  }

  if (avatarUrl !== null) {
    const ok =
      typeof avatarUrl === "string" &&
      avatarUrl.length < 2000 &&
      (/^https?:\/\//i.test(avatarUrl) || avatarUrl.startsWith("/"));
    if (!ok) return { error: "Invalid photo URL." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) return { error: error.message };

  const username = (me as { username?: string | null } | null)?.username;
  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/settings");
  revalidatePath("/admin", "layout");
  if (username) revalidatePath(`/author/${username}`);
  return { ok: true };
}
