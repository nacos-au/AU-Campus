import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { fetchMatchLineup, submitMatchLineup } from "@/lib/data/match-lineups";
import { listCompetitionRoster } from "@/lib/data/competition-rosters";
import { fetchMatchById } from "@/lib/data/repository";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }
  const lineup = await fetchMatchLineup(id, teamId);
  return NextResponse.json({ lineup });
}

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    team_id?: string;
    players?: Array<{ player_id: string; is_starting: boolean; role?: string | null }>;
  };

  if (!body.team_id || !Array.isArray(body.players)) {
    return NextResponse.json({ error: "team_id and players required" }, { status: 400 });
  }

  const starters = body.players.filter((p) => p.is_starting);
  if (starters.length < 1) {
    return NextResponse.json({ error: "Name at least one starter" }, { status: 400 });
  }

  const match = await fetchMatchById(id);
  if (!match?.tournament_id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Prefer competition roster when available.
  const roster = await listCompetitionRoster(match.tournament_id, body.team_id);
  if (!("error" in roster) && roster.nominated.length > 0) {
    const allowed = new Set(roster.nominated.map((p) => p.player_id));
    const outsider = body.players.find((p) => !allowed.has(p.player_id));
    if (outsider) {
      return NextResponse.json(
        { error: "Lineup players must be on this competition squad" },
        { status: 400 }
      );
    }
  }

  const result = await submitMatchLineup({
    match_id: id,
    team_id: body.team_id,
    players: body.players,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
