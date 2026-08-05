"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseConfig } from "@/lib/demo-mode";

export type ProfileSettingsState = { ok?: boolean; error?: string } | null;

export async function updateScoreDisplayName(
  _prev: ProfileSettingsState,
  formData: FormData
): Promise<ProfileSettingsState> {
  if (!hasSupabaseConfig()) {
    return { error: "Supabase is not configured." };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) {
    return { error: "Display name is required." };
  }
  if (displayName.length > 80) {
    return { error: "Display name must be 80 characters or fewer." };
  }

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

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  revalidatePath("/", "layout");
  revalidatePath("/account/settings");
  return { ok: true };
}
