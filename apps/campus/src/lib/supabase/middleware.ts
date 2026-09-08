import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_MAX_MS = 2 * 60 * 60 * 1000;
const SESSION_STARTED = "au_auth_session_started";
const OFFICE_MODE_COOKIE = "au_campus_office_mode";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || key.length < 20) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    supabaseResponse.cookies.set(OFFICE_MODE_COOKIE, "", { path: "/", maxAge: 0 });
    supabaseResponse.cookies.set(SESSION_STARTED, "", { path: "/", maxAge: 0 });
    return supabaseResponse;
  }

  const startedRaw = request.cookies.get(SESSION_STARTED)?.value;
  const started = startedRaw ? Number(startedRaw) : NaN;
  if (Number.isFinite(started) && Date.now() - started > SESSION_MAX_MS) {
    await supabase.auth.signOut();
    const redirect = NextResponse.redirect(
      new URL("/signin?reason=session_expired", request.url)
    );
    redirect.cookies.set(OFFICE_MODE_COOKIE, "", { path: "/", maxAge: 0 });
    redirect.cookies.set(SESSION_STARTED, "", { path: "/", maxAge: 0 });
    return redirect;
  }

  if (!Number.isFinite(started)) {
    supabaseResponse.cookies.set(SESSION_STARTED, String(Date.now()), {
      path: "/",
      maxAge: 60 * 60 * 2,
      sameSite: "lax",
      httpOnly: true,
    });
  }

  return supabaseResponse;
}
