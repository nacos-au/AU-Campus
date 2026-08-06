/** Cookie override: `on` = fixtures, `off` = live Supabase (when keys exist). */
export const DEMO_MODE_COOKIE = "au_demo_mode";

export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) return false;
  if (key === "your-anon-key" || key.length < 20) return false;
  return true;
}

/** True on Vercel production / NODE_ENV=production — demo staff bypass must stay off. */
export function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview") {
    return true;
  }
  return false;
}

function parseDemoCookie(value?: string | null): boolean | null {
  if (value === "on") return true;
  if (value === "off") return false;
  return null;
}

export function canToggleDemoMode(): boolean {
  if (isProductionRuntime()) return false;
  return hasSupabaseConfig();
}

/** Score fixture/live data mode. Production never enables demo via cookie or ?demo=. */
export function isDemoMode(cookieValue?: string | null): boolean {
  if (isProductionRuntime()) {
    return process.env.DEMO_MODE === "true";
  }

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
