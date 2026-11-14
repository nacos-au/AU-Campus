import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * OUT OF SCOPE — dedicated cron for parked posts (see docs/OUT_OF_SCOPE.md).
 *
 * Parked stories already go live via promote_due_embargoes on public page loads.
 * Keep this route for a later phase if exact-time release with zero traffic is required.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Release cron is out of scope; parked posts use page-load promote" },
      { status: 501 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("promote_due_embargoes");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, promoted: data ?? 0 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
