import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { fetchMatchLineup, submitMatchLineup } from "@/lib/data/match-lineups";
import { listCompetitionRoster } from "@/lib/data/competition-rosters";
import { fetchMatchById } from "@/lib/data/repository";
import { dbIdToSport } from "@/lib/utils/sport";

type Ctx = { params: Promise<{ id: string }> };

function minStartersForSport(sportDbId: string): number {
  const sport = dbIdToSport(sportDbId);
  if (sport === "basketball") return 5;
  if (sport === "volleyball") return 6;
  return 11;
}

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
    players?: Array<{
      player_id: string;
      is_starting: boolean;
      role?: string | null;
      is_captain?: boolean;
      jersey_number?: number | null;
    }>;
    status?: "predicted" | "confirmed";
    coach_name?: string | null;
  };

  if (!body.team_id || !Array.isArray(body.players)) {
    return NextResponse.json({ error: "team_id and players required" }, { status: 400 });
  }

  const match = await fetchMatchById(id);
  if (!match?.tournament_id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const minStarters = minStartersForSport(match.sport_id);
  const starters = body.players.filter((p) => p.is_starting);
  const bench = body.players.filter((p) => !p.is_starting);
  if (starters.length < minStarters) {
    return NextResponse.json(
      { error: `Name at least ${minStarters} starters (got ${starters.length}).` },
      { status: 400 }
    );
  }
  if (bench.length < 1) {
    return NextResponse.json(
      { error: "Name at least one substitute on the bench." },
      { status: 400 }
    );
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
    status: body.status,
    coach_name: body.coach_name,
    min_starters: minStarters,
    require_bench: true,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, status: result.status });
}
