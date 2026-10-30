import type { Match } from "@/lib/types/database";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { createClient } from "@/lib/supabase/server";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import { getTournamentsForSport } from "@/lib/data/demo-competition";
import { resolveSportUuid } from "@/lib/data/sport-ids";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

/**
 * Competition fixtures a record keeper can pick up without an admin calendar
 * assignment: official (non-friendly) matches that are scheduled or live.
 */
export async function fetchOpenCompetitionFixtures(sport?: SportId): Promise<Match[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const slug = sport ? sportToDbId(sport) : null;
    const tournamentsBySport = new Map<string, Map<string, string>>();
    const nameFor = (m: Match) => {
      if (m.tournament?.name) return m.tournament;
      let bySport = tournamentsBySport.get(m.sport_id);
      if (!bySport) {
        bySport = new Map(getTournamentsForSport(m.sport_id).map((t) => [t.id, t.name]));
        tournamentsBySport.set(m.sport_id, bySport);
      }
      const name = bySport.get(m.tournament_id);
      return name ? { id: m.tournament_id, name, sport_id: m.sport_id, category: "league" as const, season: "", rules: {} } : undefined;
    };

    return listAllDemoMatches()
      .filter((m) => !m.deleted_at)
      .filter((m) => !slug || m.sport_id === slug)
      .filter((m) => m.status === "scheduled" || m.status === "live" || m.status === "paused")
      .filter((m) => m.scope !== "pickup" && m.tournament?.category !== "friendly")
      .map((m) => ({ ...m, tournament: nameFor(m) ?? m.tournament }))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }

  const supabase = await createClient();
  let query = supabase
    .from("matches")
    .select(
      "*, venue:venues(*), home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), tournament:tournaments!inner(*)"
    )
    .in("status", ["scheduled", "live", "paused"])
    .is("deleted_at", null)
    .neq("scope", "pickup")
    .neq("tournament.category", "friendly")
    .order("scheduled_at", { ascending: true });

  if (sport) {
    const sportUuid = await resolveSportUuid(supabase, sportToDbId(sport));
    if (typeof sportUuid === "string") query = query.eq("sport_id", sportUuid);
  }

  const { data } = (await query) as { data: Match[] | null };
  return (data ?? []) as Match[];
}
