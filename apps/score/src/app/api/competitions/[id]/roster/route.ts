import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  addToCompetitionRoster,
  getCompetitionDetail,
  listCompetitionRoster,
  removeFromCompetitionRoster,
} from "@/lib/data/competition-rosters";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId");

  if (!teamId) {
    const detail = await getCompetitionDetail(id);
    if ("error" in detail) {
      return NextResponse.json({ error: detail.error }, { status: 404 });
    }
    return NextResponse.json(detail);
  }

  const roster = await listCompetitionRoster(id, teamId);
  if ("error" in roster) {
    return NextResponse.json({ error: roster.error }, { status: 400 });
  }
  return NextResponse.json(roster);
}

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    team_id?: string;
    player_id?: string;
    jersey_number?: number | null;
  };

  if (!body.team_id || !body.player_id) {
    return NextResponse.json({ error: "team_id and player_id are required" }, { status: 400 });
  }

  const result = await addToCompetitionRoster({
    tournament_id: id,
    team_id: body.team_id,
    player_id: body.player_id,
    jersey_number: body.jersey_number,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const result = await removeFromCompetitionRoster(id, playerId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
