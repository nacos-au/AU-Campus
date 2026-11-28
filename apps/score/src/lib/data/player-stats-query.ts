import { resolveSportUuid, type Supabase } from "@/lib/data/sport-ids";
import {
  summarizePlayerStats,
  type PlayerCareerStats,
  type PlayerStatEvent,
  type PlayerStatLineup,
} from "@/lib/players/player-stats";

/** Keeps `in.(…)` lists short enough for the request URL. */
const CHUNK = 80;

function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const ZERO: PlayerCareerStats = {
  appearances: 0,
  goals: 0,
  assists: 0,
  yellow_cards: 0,
  red_cards: 0,
};

/**
 * Career stats for one player in one sport, from completed non-draft matches.
 * Returns null when the data could not be read, so the page can say so instead
 * of showing zeros that look real.
 */
export async function queryPlayerStats(
  supabase: Supabase,
  playerId: string,
  sportDbId: string
): Promise<PlayerCareerStats | null> {
  const sportUuid = await resolveSportUuid(supabase, sportDbId);
  if (typeof sportUuid !== "string") {
    console.error("[player-stats] sport lookup failed:", sportUuid.error);
    return null;
  }

  // Clubs the player has been registered with in this sport (active or not).
  const { data: regs, error: regError } = (await supabase
    .from("player_sport_registry")
    .select("team_id, team:teams!inner(sport_id)")
    .eq("player_id", playerId)
    .eq("team.sport_id", sportUuid)) as {
    data: Array<{ team_id: string }> | null;
    error: { message: string } | null;
  };
  if (regError) {
    console.error("[player-stats] registry read failed:", regError.message);
    return null;
  }
  const teamIds = [...new Set((regs ?? []).map((r) => r.team_id))];
  if (!teamIds.length) return { ...ZERO };

  const teamList = teamIds.join(",");
  const { data: matches, error: matchError } = (await supabase
    .from("matches")
    .select("id, tournament:tournaments!inner(id, is_draft)")
    .eq("sport_id", sportUuid)
    .eq("status", "completed")
    .is("deleted_at", null)
    .eq("tournament.is_draft", false)
    .or(`home_team_id.in.(${teamList}),away_team_id.in.(${teamList})`)
    .limit(500)) as {
    data: Array<{ id: string }> | null;
    error: { message: string } | null;
  };
  if (matchError) {
    console.error("[player-stats] matches read failed:", matchError.message);
    return null;
  }
  const matchIds = (matches ?? []).map((m) => m.id);
  if (!matchIds.length) return { ...ZERO };

  const events: PlayerStatEvent[] = [];
  const lineups: PlayerStatLineup[] = [];

  for (const ids of chunks(matchIds)) {
    // Only this player's rows: their own events, goals they set up, and subs they came on for.
    const { data: ev, error: evError } = (await supabase
      .from("match_events")
      .select("match_id, event_type, period, player_id, details")
      .in("match_id", ids)
      .eq("is_void", false)
      .or(
        `player_id.eq.${playerId},details->>assist_player_id.eq.${playerId},details->>player_in_id.eq.${playerId}`
      )) as {
      data: PlayerStatEvent[] | null;
      error: { message: string } | null;
    };
    if (evError) {
      console.error("[player-stats] events read failed:", evError.message);
      return null;
    }
    events.push(...(ev ?? []));

    const { data: lu, error: luError } = (await supabase
      .from("match_lineups")
      .select("match_id, players")
      .in("match_id", ids)
      .in("team_id", teamIds)) as {
      data: PlayerStatLineup[] | null;
      error: { message: string } | null;
    };
    if (luError) {
      console.error("[player-stats] lineups read failed:", luError.message);
      return null;
    }
    lineups.push(...(lu ?? []));
  }

  return summarizePlayerStats({ playerId, events, lineups });
}
