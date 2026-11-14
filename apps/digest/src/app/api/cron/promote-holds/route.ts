import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lift “held for release” stories whose hold time has passed.
 * Prefer a free external ping (cron-job.org) over Vercel Cron — Hobby only allows
 * about one run per day; frequent schedules need a paid Vercel plan.
 *
 * cron-job.org (free): GET https://<host>/api/cron/promote-holds every 5 min,
 * header Authorization: Bearer <CRON_SECRET>.
 *
 * Without any cron, homepage/section/article loads still promote due holds.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
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
