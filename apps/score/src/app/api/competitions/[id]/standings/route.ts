import { NextResponse } from "next/server";
import { recomputeStandingsFromMatches } from "@/lib/competition/standings";
import { getCompetitionDetail } from "@/lib/data/competition-rosters";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import { findDemoTeam } from "@/lib/data/demo-roster";
import type { Match } from "@/lib/types/database";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const detail = await getCompetitionDetail(id);
  if ("error" in detail) {
    return NextResponse.json({ error: detail.error }, { status: 404 });
  }

  const teams = detail.teams.map((t) => ({
    id: t.team_id,
    name: t.team_name,
    short_code: findDemoTeam(t.team_id)?.department?.short_code ?? null,
    logo_url: findDemoTeam(t.team_id)?.logo_url ?? null,
  }));

  let matches: Match[] = [];
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    matches = listAllDemoMatches().filter((m) => m.tournament_id === id);
  } else {
    const supabase = await createClient();
    const { data } = (await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id)
      .is("deleted_at", null)) as { data: Match[] | null };
    matches = data ?? [];
  }

  const standings = recomputeStandingsFromMatches(matches, teams);
  return NextResponse.json({ standings });
}
