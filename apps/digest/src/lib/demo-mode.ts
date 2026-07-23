/** Cookie override: `on` = fixtures, `off` = live Supabase (when keys exist). */
export const DEMO_MODE_COOKIE = "au_demo_mode";

/**
 * Demo mode serves fixture content with no database.
 *
 * Priority (when Supabase keys are configured):
 * 1. Cookie `au_demo_mode=on|off` — runtime toggle on the site
 * 2. DEMO_MODE=true env → demo
 * 3. DEMO_MODE=false env → live
 * 4. Default → live
 *
 * Without valid keys → always demo (deploy-safe).
 */
export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) return false;
  if (key === "your-anon-key" || key.length < 20) return false;
  return true;
}

function parseDemoCookie(value?: string | null): boolean | null {
  if (value === "on") return true;
  if (value === "off") return false;
  return null;
}

export function canToggleDemoMode(): boolean {
  return hasSupabaseConfig();
}

export function isDemoMode(cookieValue?: string | null): boolean {
  if (!hasSupabaseConfig()) return true;

  const override = parseDemoCookie(cookieValue);
  if (override !== null) return override;

  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return false;
}

export function demoModeCookieOptions(enabled: boolean) {
  return {
    name: DEMO_MODE_COOKIE,
    value: enabled ? "on" : "off",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}
