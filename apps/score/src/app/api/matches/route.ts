import { NextResponse } from "next/server";
import { requireAdmin, requireMatchStaff } from "@/lib/auth/roles";
import { assertSidesHaveMinStarters } from "@/lib/data/lineup-gate";
import { createMatch, listMatchesForAdmin } from "@/lib/data/repository";
import type { MatchScope } from "@/lib/types/database";

/** Live match list for admin edit / lineup tools. */
export async function GET() {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const matches = await listMatchesForAdmin();
  return NextResponse.json({ matches });
}

/** Friendlies and one-off manual matches — admin only. Keepers fill competition fixtures. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as {
    sport_id?: string;
    home_team_id?: string;
    away_team_id?: string;
    status?: string;
    scheduled_at?: string;
    home_score?: number;
    away_score?: number;
    home_penalties?: number | null;
    away_penalties?: number | null;
    scope?: MatchScope;
    venue_id?: string | null;
    tournament_id?: string | null;
    set_scores?: Array<{ set_number: number; home_games: number; away_games: number }>;
    lineup_image_url?: string | null;
  };

  if (!body.sport_id || !body.home_team_id || !body.away_team_id) {
    return NextResponse.json({ error: "Sport and both teams are required" }, { status: 400 });
  }
  if (body.status !== "scheduled" && body.status !== "completed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (body.status === "scheduled" && body.tournament_id) {
    const squadGate = await assertSidesHaveMinStarters({
      tournamentId: body.tournament_id,
      homeTeamId: body.home_team_id,
      awayTeamId: body.away_team_id,
      sportSlug: body.sport_id?.startsWith("sport-")
        ? body.sport_id.replace(/^sport-/, "")
        : null,
    });
    if ("error" in squadGate) {
      return NextResponse.json({ error: squadGate.error }, { status: 400 });
    }
  }

  const result = await createMatch({
    sport_id: body.sport_id,
    home_team_id: body.home_team_id,
    away_team_id: body.away_team_id,
    status: body.status,
    scheduled_at: body.scheduled_at ?? new Date().toISOString(),
    home_score: body.home_score ?? 0,
    away_score: body.away_score ?? 0,
    home_penalties: body.home_penalties ?? null,
    away_penalties: body.away_penalties ?? null,
    scope: body.scope ?? "pickup",
    venue_id: body.venue_id ?? null,
    tournament_id: body.tournament_id ?? null,
    set_scores: body.set_scores,
    lineup_image_url: body.lineup_image_url ?? null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
