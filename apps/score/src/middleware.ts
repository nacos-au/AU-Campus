import { type NextRequest, NextResponse } from "next/server";
import { demoModeCookieOptions, isProductionRuntime } from "@/lib/demo-mode";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const demoParam = request.nextUrl.searchParams.get("demo");
  if (demoParam === "1" || demoParam === "0") {
    const url = request.nextUrl.clone();
    url.searchParams.delete("demo");
    const res = NextResponse.redirect(url);
    // Never honor ?demo= in production — blocks unsigned staff bypass via cookie.
    if (!isProductionRuntime()) {
      const opts = demoModeCookieOptions(demoParam === "1");
      res.cookies.set(opts.name, opts.value, {
        path: opts.path,
        maxAge: opts.maxAge,
        sameSite: opts.sameSite,
      });
    }
    return res;
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
