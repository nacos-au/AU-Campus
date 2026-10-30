import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Click-through: count, then redirect to the advertiser. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.rpc("ad_click", { p_id: id });
  const target = typeof data === "string" ? data : null;
  if (!target) return NextResponse.redirect(new URL("/", _req.url));
  return NextResponse.redirect(target, 302);
}
