import { NextResponse } from "next/server";
import {
  createMatchEvent,
  fetchMatchEvents,
  updateMatchEvent,
  voidMatchEvent,
} from "@/lib/data/repository";
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

/** Assist attach, edit fields, or soft-void a log entry. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: matchId } = await params;
  const body = (await request.json()) as {
    event_id?: string;
    void?: boolean;
    is_void?: boolean;
    match_time?: string;
    period?: string;
    team_id?: string | null;
    player_id?: string | null;
    event_type?: string;
    details?: Record<string, unknown>;
  };

  if (!body.event_id) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  if (body.void === true || body.is_void === true) {
    const result = await voidMatchEvent(matchId, body.event_id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, voided: true });
  }

  const result = await updateMatchEvent({
    match_id: matchId,
    event_id: body.event_id,
    match_time: body.match_time,
    period: body.period,
    team_id: body.team_id,
    player_id: body.player_id,
    event_type: body.event_type,
    details: body.details,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
