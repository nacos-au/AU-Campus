import { type NextRequest, NextResponse } from "next/server";
import { demoModeCookieOptions } from "@/lib/demo-mode";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const demoParam = request.nextUrl.searchParams.get("demo");
  if (demoParam === "1" || demoParam === "0") {
    const url = request.nextUrl.clone();
    url.searchParams.delete("demo");
    const res = NextResponse.redirect(url);
    const opts = demoModeCookieOptions(demoParam === "1");
    res.cookies.set(opts.name, opts.value, {
      path: opts.path,
      maxAge: opts.maxAge,
      sameSite: opts.sameSite,
    });
    return res;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
