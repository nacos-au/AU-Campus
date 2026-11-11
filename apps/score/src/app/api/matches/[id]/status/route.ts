import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { updateMatchStatus } from "@/lib/data/repository";

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
    status?: string;
    postpone_reason?: string | null;
    /** When starting live: wipe prior events/scores/clock so kick-off is clean. */
    fresh_kickoff?: boolean;
  };

  if (!body.status || !["scheduled", "live", "completed", "postponed"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (body.status === "postponed" && !body.postpone_reason?.trim()) {
    return NextResponse.json({ error: "postpone_reason required" }, { status: 400 });
  }

  const result = await updateMatchStatus(
    id,
    body.status as "scheduled" | "live" | "completed" | "postponed",
    {
      postpone_reason: body.postpone_reason,
      freshKickoff: body.status === "live" ? body.fresh_kickoff !== false : false,
    }
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, match_id: id, status: body.status });
}
