import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  getCompetitionDetail,
  listCompetitionFixtures,
} from "@/lib/data/competition-rosters";
import { createMatch } from "@/lib/data/repository";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const detail = await getCompetitionDetail(id);
  if ("error" in detail) {
    return NextResponse.json({ error: detail.error }, { status: 404 });
  }

  const fixtures = await listCompetitionFixtures(id);
  const playing = new Set<string>();
  for (const f of fixtures) {
    if (f.home_team_id) playing.add(f.home_team_id);
    if (f.away_team_id) playing.add(f.away_team_id);
  }
  const idle = detail.teams.filter((t) => !playing.has(t.team_id));

  return NextResponse.json({
    competition: detail.competition,
    teams: detail.teams,
    fixtures,
    idle_teams: idle,
  });
}

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const detail = await getCompetitionDetail(id);
  if ("error" in detail) {
    return NextResponse.json({ error: detail.error }, { status: 404 });
  }

  const body = (await request.json()) as {
    home_team_id?: string;
    away_team_id?: string;
    scheduled_at?: string;
    venue_id?: string | null;
  };

  if (!body.home_team_id || !body.away_team_id) {
    return NextResponse.json({ error: "Both teams are required" }, { status: 400 });
  }
  if (body.home_team_id === body.away_team_id) {
    return NextResponse.json({ error: "Home and away must differ" }, { status: 400 });
  }
  if (!body.scheduled_at) {
    return NextResponse.json({ error: "Kick-off time is required" }, { status: 400 });
  }
  if (!body.venue_id) {
    return NextResponse.json({ error: "Venue is required" }, { status: 400 });
  }

  const teamIds = new Set(detail.teams.map((t) => t.team_id));
  if (!teamIds.has(body.home_team_id) || !teamIds.has(body.away_team_id)) {
    return NextResponse.json(
      { error: "Both sides must be registered in this competition" },
      { status: 400 }
    );
  }

  const result = await createMatch({
    sport_id: detail.competition.sport_id,
    home_team_id: body.home_team_id,
    away_team_id: body.away_team_id,
    status: "scheduled",
    scheduled_at: new Date(body.scheduled_at).toISOString(),
    home_score: 0,
    away_score: 0,
    scope: "official",
    venue_id: body.venue_id,
    tournament_id: id,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
