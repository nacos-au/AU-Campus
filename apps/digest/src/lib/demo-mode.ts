/** Legacy cookie name — kept so old cookies clear cleanly; demo mode is retired. */
export const DEMO_MODE_COOKIE = "au_demo_mode";

/**
 * Live Supabase only. Fixture/demo mode has been removed from the public app.
 * Without valid keys the site cannot load content (empty / error states).
 */
export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) return false;
  if (key === "your-anon-key" || key.length < 20) return false;
  return true;
}

/** @deprecated Demo toggle removed — always false. */
export function canToggleDemoMode(): boolean {
  return false;
}

/** @deprecated Always live when configured; never serve fixtures. */
export function isDemoMode(_cookieValue?: string | null): boolean {
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
