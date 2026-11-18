import { type NextRequest, NextResponse } from "next/server";
import { digestFeatures } from "@/lib/features";
import { updateSession } from "@/lib/supabase/middleware";

const PAUSED_PREFIXES: { on: boolean; prefixes: string[] }[] = [
  { on: digestFeatures.forum, prefixes: ["/forum"] },
  { on: digestFeatures.talent, prefixes: ["/talent", "/admin/talent"] },
  {
    on: digestFeatures.printEditions,
    prefixes: ["/editions", "/read", "/admin/editions"],
  },
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  for (const gate of PAUSED_PREFIXES) {
    if (gate.on) continue;
    if (gate.prefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Strip legacy ?demo= shortcuts (demo mode retired)
  if (request.nextUrl.searchParams.has("demo")) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("demo");
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
