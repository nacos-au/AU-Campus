import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { fetchMatchLineup, submitMatchLineup } from "@/lib/data/match-lineups";
import { listCompetitionRoster } from "@/lib/data/competition-rosters";
import { fetchMatchById } from "@/lib/data/repository";
import { dbIdToSport } from "@/lib/utils/sport";
import { validateLineupSheet } from "@/lib/match/lineup-validate";
import { normaliseAvailability, type AvailabilityStatus } from "@/lib/match/lineup-merge";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";

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
    formation?: string | null;
  };

  if (!body.team_id || !Array.isArray(body.players)) {
    return NextResponse.json({ error: "team_id and players required" }, { status: 400 });
  }

  const match = await fetchMatchById(id);
  if (!match?.tournament_id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const minStarters = minStartersForSport(match.sport_id);

  // Squad + availability from the competition roster when one exists.
  const roster = await listCompetitionRoster(match.tournament_id, body.team_id);
  const hasRoster = !("error" in roster) && roster.nominated.length > 0;
  const squadIds = hasRoster ? new Set(roster.nominated.map((p) => p.player_id)) : null;
  const availability = new Map<string, AvailabilityStatus>();
  if (!("error" in roster)) {
    for (const p of [...roster.nominated, ...roster.pool]) {
      availability.set(p.player_id, normaliseAvailability(p.availability));
    }
  }

  // Suspended players (live DB only).
  const suspendedIds = new Set<string>();
  if (hasSupabaseConfig() && !(await getScoreDemoMode())) {
    const supabase = await createClient();
    const { data: active } = (await supabase
      .from("player_suspensions")
      .select("player_id")
      .in("player_id", body.players.map((p) => p.player_id))
      .eq("is_active", true)) as { data: Array<{ player_id: string }> | null };
    for (const row of active ?? []) suspendedIds.add(row.player_id);
  }

  const requireBench = !("error" in roster) && roster.require_named_bench;

  const validation = validateLineupSheet({
    players: body.players,
    starters: minStarters,
    formation: body.formation ?? null,
    squadIds,
    suspendedIds,
    availability,
    mode: "staff",
    requireBench,
  });
  if (validation.errors.length) {
    return NextResponse.json(
      { error: validation.errors.join(" "), errors: validation.errors, warnings: validation.warnings },
      { status: 400 }
    );
  }

  const result = await submitMatchLineup({
    match_id: id,
    team_id: body.team_id,
    players: body.players,
    status: body.status,
    coach_name: body.coach_name,
    formation: body.formation ?? null,
    min_starters: minStarters,
    require_bench: requireBench,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, status: result.status, warnings: validation.warnings });
}
