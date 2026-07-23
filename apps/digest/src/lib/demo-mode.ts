/**
 * Demo mode serves fixture content with no database.
 *
 * Priority:
 * 1. DEMO_MODE=true  → always demo
 * 2. Supabase URL/key missing or placeholder → demo (even if DEMO_MODE=false),
 *    so a Vercel deploy without keys never 500s in middleware
 * 3. Otherwise → live Supabase
 */
export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) return false;
  if (key === "your-anon-key" || key.length < 20) return false;
  return true;
}

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (!hasSupabaseConfig()) return true;
  if (process.env.DEMO_MODE === "false") return false;
  return false;
}
