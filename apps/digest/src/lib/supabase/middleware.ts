import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";

const PROTECTED_PREFIXES = ["/admin", "/account", "/read", "/share"];

export async function updateSession(request: NextRequest) {
  // Never construct a Supabase client without URL+key — that throws a 500
  // in the Vercel edge/proxy runtime before any page can render.
  // (Demo mode only swaps content; a real session still counts.)
  if (!hasSupabaseConfig()) {
    const path = request.nextUrl.pathname;
    if (PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Do not run code between createServerClient and getUser: it can cause
    // random logouts by desyncing the auth cookies.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

    if (!user && needsAuth) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.error("[middleware] session refresh failed:", err);
  }

  return supabaseResponse;
}
