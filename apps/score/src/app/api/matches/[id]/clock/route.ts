import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { updateMatch } from "@/lib/data/repository";

/** Keeper publishes the running clock for public spectators. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    clock_elapsed_seconds?: number;
    clock_is_running?: boolean;
    clock_is_time_lost?: boolean;
    clock_running_started_at?: string | null;
    clock_stoppage_seconds?: number;
    clock_boarded_stoppage_minutes?: number;
    clock_time_lost_started_at?: string | null;
  };

  const result = await updateMatch(id, {
    clock_elapsed_seconds: body.clock_elapsed_seconds,
    clock_is_running: body.clock_is_running,
    clock_is_time_lost: body.clock_is_time_lost,
    clock_running_started_at: body.clock_running_started_at ?? null,
    clock_stoppage_seconds: body.clock_stoppage_seconds,
    clock_boarded_stoppage_minutes: body.clock_boarded_stoppage_minutes,
    clock_time_lost_started_at: body.clock_time_lost_started_at ?? null,
  });

  if ("error" in result) {
    // Column may be missing until score SQL is applied — don't block keeper UX.
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }
  return NextResponse.json({ ok: true });
}
