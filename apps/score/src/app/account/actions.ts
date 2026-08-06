"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { validateUsername } from "@/lib/username";

export type ProfileSettingsState = { ok?: boolean; error?: string } | null;

export async function updateScoreProfile(
  _prev: ProfileSettingsState,
  formData: FormData
): Promise<ProfileSettingsState> {
  if (!hasSupabaseConfig()) {
    return { error: "Supabase is not configured." };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const parsed = validateUsername(String(formData.get("username") ?? ""));

  if (!displayName) {
    return { error: "Display name is required." };
  }
  if (displayName.length > 80) {
    return { error: "Display name must be 80 characters or fewer." };
  }
  if (!parsed.ok) return { error: parsed.error };

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore
          }
        },
      },
    }
  );

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
    .update({ display_name: displayName, username: parsed.username })
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
  revalidatePath("/account/settings");
  return { ok: true };
}

/** @deprecated Prefer updateScoreProfile */
export const updateScoreDisplayName = updateScoreProfile;
