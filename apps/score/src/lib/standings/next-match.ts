import { DEMO_MATCHES } from "@/lib/data/demo";
import type { Match, NextMatchInfo, StandingRow } from "@/lib/types/database";
import type { SportId } from "@/lib/utils/sport";

const NEXT_MATCH_SPORTS: SportId[] = ["football", "basketball", "tennis", "volleyball"];

export function sportSupportsNextMatch(sport: SportId): boolean {
  return NEXT_MATCH_SPORTS.includes(sport);
}

/** Default competition used to resolve upcoming fixtures per sport. */
export function getDefaultLeagueTournamentId(sport: SportId): string | undefined {
  switch (sport) {
    case "football":
      return "tourn-ifl-2026";
    case "basketball":
      return "tourn-bball-league-2026";
    case "volleyball":
      return "tourn-volley-league-2026";
    case "tennis":
      return "tourn-tennis-2026";
    default:
      return undefined;
  }
}

/** Earliest scheduled fixture per team from a match list. */
export function buildNextMatchMapFromFixtures(matches: Match[]): Map<string, NextMatchInfo> {
  const map = new Map<string, NextMatchInfo>();
  const upcoming = matches
    .filter((m) => m.status === "scheduled" && !m.deleted_at)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  for (const match of upcoming) {
    assignIfMissing(map, match.home_team_id, match, "home");
    assignIfMissing(map, match.away_team_id, match, "away");
  }
  return map;
}

/** Earliest scheduled league fixture per team, keyed by team id (demo). */
export function buildNextMatchByTeam(tournamentId: string): Map<string, NextMatchInfo> {
  return buildNextMatchMapFromFixtures(
    DEMO_MATCHES.filter((m) => m.tournament_id === tournamentId)
  );
}

function assignIfMissing(
  map: Map<string, NextMatchInfo>,
  teamId: string | null,
  match: Match,
  side: "home" | "away"
) {
  if (!teamId || map.has(teamId)) return;
  const opponent = side === "home" ? match.away_team : match.home_team;
  if (!opponent) return;
  map.set(teamId, {
    opponent_team_id: side === "home" ? (match.away_team_id ?? "") : (match.home_team_id ?? ""),
    opponent_name: opponent.name,
    short_code: opponent.department?.short_code ?? opponent.name.slice(0, 3).toUpperCase(),
    logo_url: opponent.logo_url,
  });
}

export function enrichStandingsWithNextMatch(
  rows: StandingRow[],
  sport: SportId,
  tournamentId?: string
): StandingRow[] {
  if (!tournamentId || !sportSupportsNextMatch(sport)) return rows;
  const nextByTeam = buildNextMatchByTeam(tournamentId);
  return rows.map((row) => ({
    ...row,
    next_match: nextByTeam.get(row.team_id) ?? null,
  }));
}
