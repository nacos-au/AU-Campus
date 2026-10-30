import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let ids: string[] = [];
  try {
    const body = await req.json();
    ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  } catch {
    /* ignore */
  }
  if (ids.length === 0 || ids.length > 10) return NextResponse.json({ ok: false }, { status: 400 });
  await createAdminClient().rpc("ad_impression", { p_ids: ids });
  return NextResponse.json({ ok: true });
}
