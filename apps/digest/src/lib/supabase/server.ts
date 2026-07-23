import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/demo-mode";
import { createDemoClient } from "./demo-client";

/** Anon-key server client bound to the request cookies. RLS applies. */
export async function createClient(): Promise<SupabaseClient> {
  if (isDemoMode()) {
    // Fixture-backed read-only client; lets the site render with no database.
    return createDemoClient() as unknown as SupabaseClient;
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
            // Called from a Server Component: middleware refreshes sessions.
          }
        },
      },
    }
  );
}
