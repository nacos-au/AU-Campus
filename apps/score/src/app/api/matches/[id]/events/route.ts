import { NextResponse } from "next/server";
import { createMatchEvent, fetchMatchEvents } from "@/lib/data/repository";
import { requireMatchStaff } from "@/lib/auth/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const events = await fetchMatchEvents(id);
  return NextResponse.json({ events });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = await request.json();

  const result = await createMatchEvent({
    match_id: id,
    team_id: body.team_id,
    player_id: body.player_id,
    event_type: body.event_type,
    period: body.period,
    match_time: body.match_time,
    details: body.details,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
