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
  const body = (await request.json()) as { status?: string };

  if (!body.status || !["scheduled", "live", "completed"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await updateMatchStatus(id, body.status as "scheduled" | "live" | "completed");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, match_id: id, status: body.status });
}
