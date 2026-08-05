import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { hasSupabaseConfig } from "@/lib/demo-mode";

/**
 * Always uses the real Supabase project when keys exist.
 * Demo-mode fixture clients must never handle sign-in / sign-up / sign-out —
 * otherwise Digest "login" succeeds while Score (live auth) fails for the same user.
 */
export async function createAuthClient(): Promise<SupabaseClient> {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to apps/digest/.env.local."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
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
            // Server Component — cookie writes ignored; middleware refreshes sessions.
          }
        },
      },
    }
  );
}
