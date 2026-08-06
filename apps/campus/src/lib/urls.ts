const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000";
const DIGEST_URL = process.env.NEXT_PUBLIC_DIGEST_URL ?? "http://localhost:3001";
const SCORE_URL = process.env.NEXT_PUBLIC_SCORE_URL ?? "http://localhost:3002";

export { CAMPUS_URL, DIGEST_URL, SCORE_URL };

export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) return false;
  if (key === "your-anon-key" || key.length < 20) return false;
  return true;
}
