import { NextResponse } from "next/server";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { reoptimizeArticleImagesBatch } from "@/lib/reoptimize-images";
import { createAuthClient } from "@/lib/supabase/auth-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile, "editor")) {
    return NextResponse.json({ error: "Editors only" }, { status: 403 });
  }

  let limit = 5;
  let offset = 0;
  try {
    const body = (await req.json()) as { limit?: number; offset?: number };
    if (typeof body.limit === "number") limit = body.limit;
    if (typeof body.offset === "number") offset = body.offset;
  } catch {
    /* empty body is fine */
  }

  const supabase = await createAuthClient();
  try {
    const result = await reoptimizeArticleImagesBatch(supabase, { limit, offset });
    return NextResponse.json({ ...result, nextOffset: offset + result.scanned });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Reoptimize failed" },
      { status: 500 }
    );
  }
}
