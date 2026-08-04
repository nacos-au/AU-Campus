import type { SportId } from "@/lib/utils/sport";
import { sportToDbId } from "@/lib/utils/sport";
import type { Match, StandingRow } from "@/lib/types/database";
import type { StatLeader } from "@/components/stats/stat-leader-card";
import {
  DEMO_STANDINGS_BASKETBALL,
  DEMO_STANDINGS_FOOTBALL,
  DEMO_STANDINGS_TENNIS,
  DEMO_STANDINGS_TRACK,
  DEMO_STANDINGS_VOLLEYBALL,
  DEMO_STAT_LEADERS_BASKETBALL,
  DEMO_STAT_LEADERS_FOOTBALL,
  DEMO_STAT_LEADERS_TENNIS,
  DEMO_STAT_LEADERS_TRACK,
  DEMO_STAT_LEADERS_VOLLEYBALL,
  DEMO_TEAMS,
} from "@/lib/data/demo";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import { playerAvatarForId } from "@/lib/utils/sport-assets";
import { getSportConfig } from "@/lib/utils/sport-config";
import { enrichStandingsWithNextMatch } from "@/lib/standings/next-match";

function enrichStandings(rows: StandingRow[], sport: SportId): StandingRow[] {
  if (sport === "track") {
    return rows.map((row) => ({
      ...row,
      logo_url: row.logo_url ?? playerAvatarForId(row.team_id),
    }));
  }
  const sportDbId = sportToDbId(sport);
  return rows.map((row) => {
    const team = DEMO_TEAMS.find((t) => t.id === row.team_id && t.sport_id === sportDbId);
    return { ...row, logo_url: row.logo_url ?? team?.logo_url ?? null };
  });
}

export function getMatchesBySport(sport: SportId, tournamentId?: string): Match[] {
  const matches = listAllDemoMatches().filter((m) => m.sport_id === sportToDbId(sport));
  if (!tournamentId) return matches;
  return matches.filter((m) => m.tournament_id === tournamentId);
}

export function getStandingsBySport(sport: SportId, tournamentId?: string): StandingRow[] {
  let rows: StandingRow[];
  switch (sport) {
    case "basketball":
      rows = enrichStandings(DEMO_STANDINGS_BASKETBALL, sport);
      break;
    case "tennis":
      rows = enrichStandings(DEMO_STANDINGS_TENNIS, sport);
      break;
    case "track":
      rows = enrichStandings(DEMO_STANDINGS_TRACK, sport);
      break;
    case "volleyball":
      rows = enrichStandings(DEMO_STANDINGS_VOLLEYBALL, sport);
      break;
    default:
      rows = enrichStandings(DEMO_STANDINGS_FOOTBALL, sport);
  }
  return enrichStandingsWithNextMatch(rows, sport, tournamentId);
}

export function getStatLeadersBySport(sport: SportId): {
  goals: StatLeader[];
  assists: StatLeader[];
  passes: StatLeader[];
  cleanSheets: StatLeader[];
} {
  switch (sport) {
    case "basketball":
      return DEMO_STAT_LEADERS_BASKETBALL;
    case "tennis":
      return DEMO_STAT_LEADERS_TENNIS;
    case "track":
      return DEMO_STAT_LEADERS_TRACK;
    case "volleyball":
      return DEMO_STAT_LEADERS_VOLLEYBALL;
    default:
      return DEMO_STAT_LEADERS_FOOTBALL;
  }
}

export function getStatLabelsBySport(sport: SportId): [string, string, string, string] {
  switch (sport) {
    case "basketball":
      return ["Points", "Rebounds", "Assists", "3-Pointers"];
    case "tennis":
      return ["Match Wins", "Set Wins", "Aces", "Break Points"];
    case "track":
      return ["100m", "200m", "400m", "Medals"];
    case "volleyball":
      return ["Kills", "Blocks", "Aces", "Digs"];
    default:
      return ["Goals", "Assists", "Total Passes", "Clean Sheets"];
  }
}

export interface StatCard {
  title: string;
  leaders: StatLeader[];
  /** Index into the sport's stat slots — used for value formatting */
  statIndex: number;
}

/**
 * Stat leader cards per sport. Football drops the passes column — clean
 * sheets are computed post-match from goalkeeper minutes (see
 * lib/match/clean-sheets.ts), not tallied live.
 */
export function getStatCardsBySport(sport: SportId): StatCard[] {
  const labels = getStatLabelsBySport(sport);
  const leaders = getStatLeadersBySport(sport);
  const slots: { title: string; leaders: StatLeader[]; statIndex: number }[] = [
    { title: labels[0], leaders: leaders.goals, statIndex: 0 },
    { title: labels[1], leaders: leaders.assists, statIndex: 1 },
    { title: labels[2], leaders: leaders.passes, statIndex: 2 },
    { title: labels[3], leaders: leaders.cleanSheets, statIndex: 3 },
  ];
  if (sport === "football") {
    return slots.filter((s) => s.title !== "Total Passes");
  }
  return slots;
}

/** Format leader stat values per sport (e.g. track times in seconds). */
export function formatStatValue(sport: SportId, statIndex: number, value: number): string {
  if (sport === "track" && statIndex < 3) {
    return `${value.toFixed(2)}s`;
  }
  return String(value);
}

export { getSportConfig };
