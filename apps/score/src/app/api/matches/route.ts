import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { createMatch } from "@/lib/data/repository";
import type { MatchScope } from "@/lib/types/database";

export async function POST(request: Request) {
  const gate = await requireMatchStaff();
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
    scope?: MatchScope;
    venue_id?: string | null;
    tournament_id?: string | null;
    set_scores?: Array<{ set_number: number; home_games: number; away_games: number }>;
  };

  if (!body.sport_id || !body.home_team_id || !body.away_team_id) {
    return NextResponse.json({ error: "Sport and both teams are required" }, { status: 400 });
  }
  if (body.status !== "scheduled" && body.status !== "completed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await createMatch({
    sport_id: body.sport_id,
    home_team_id: body.home_team_id,
    away_team_id: body.away_team_id,
    status: body.status,
    scheduled_at: body.scheduled_at ?? new Date().toISOString(),
    home_score: body.home_score ?? 0,
    away_score: body.away_score ?? 0,
    scope: body.scope ?? "pickup",
    venue_id: body.venue_id ?? null,
    tournament_id: body.tournament_id ?? null,
    set_scores: body.set_scores,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
