import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CAMPUS_URL } from "@/lib/urls";

/**
 * Handles email confirmation + password-recovery redirects from Supabase Auth.
 * Add this URL to Authentication → URL configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL(`/signin?error=auth_callback`, CAMPUS_URL)
  );
}
