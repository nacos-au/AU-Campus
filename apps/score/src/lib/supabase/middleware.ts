import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_SESSION_MAX_MS,
  AUTH_SESSION_STARTED_COOKIE,
} from "@/lib/auth/session-policy";

const ADMIN_MODE_COOKIE = "au_admin_mode";

/**
 * Refresh Supabase session cookies. Enforce a 2-hour absolute session
 * via au_auth_session_started (set on sign-in). Hosted Auth timebox
 * should also be 2h.
 */
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
    supabaseResponse.cookies.set(ADMIN_MODE_COOKIE, "", { path: "/", maxAge: 0 });
    supabaseResponse.cookies.set(AUTH_SESSION_STARTED_COOKIE, "", { path: "/", maxAge: 0 });
    return supabaseResponse;
  }

  const startedRaw = request.cookies.get(AUTH_SESSION_STARTED_COOKIE)?.value;
  const started = startedRaw ? Number(startedRaw) : NaN;
  if (Number.isFinite(started) && Date.now() - started > AUTH_SESSION_MAX_MS) {
    await supabase.auth.signOut();
    const isApi = request.nextUrl.pathname.startsWith("/api/");
    if (isApi) {
      const res = NextResponse.json(
        { error: "Sign in required", reason: "session_expired" },
        { status: 401 }
      );
      res.cookies.set(ADMIN_MODE_COOKIE, "", { path: "/", maxAge: 0 });
      res.cookies.set(AUTH_SESSION_STARTED_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }
    const redirect = NextResponse.redirect(
      new URL("/?auth=signin&reason=session_expired", request.url)
    );
    redirect.cookies.set(ADMIN_MODE_COOKIE, "", { path: "/", maxAge: 0 });
    redirect.cookies.set(AUTH_SESSION_STARTED_COOKIE, "", { path: "/", maxAge: 0 });
    return redirect;
  }

  // First authenticated request without marker — stamp now (legacy sessions)
  if (!Number.isFinite(started)) {
    supabaseResponse.cookies.set(AUTH_SESSION_STARTED_COOKIE, String(Date.now()), {
      path: "/",
      maxAge: 60 * 60 * 2,
      sameSite: "lax",
      httpOnly: true,
    });
  }

  return supabaseResponse;
}
