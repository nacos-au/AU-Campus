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
      return ["PPG", "RPG", "3PG", "APG"];
    case "tennis":
      return ["Match Wins", "Set Wins", "Aces", "Break Points"];
    case "track":
      return ["100m", "200m", "400m", "Medals"];
    case "volleyball":
      return ["Kills", "Blocks", "Aces", "Digs"];
    default:
      return ["Goals", "Assists", "Clean Sheets", "Appearances"];
  }
}

export interface StatCard {
  title: string;
  leaders: StatLeader[];
  /** Index into the sport's stat slots — used for value formatting */
  statIndex: number;
}

const BASKETBALL_GAMES = 10;

function perGameLeaders(leaders: StatLeader[], games = BASKETBALL_GAMES): StatLeader[] {
  return leaders.map((l) => ({
    ...l,
    value: Math.round((l.value / games) * 10) / 10,
  }));
}

/**
 * Stat leader cards per sport. Basketball defaults to per-game rates.
 * Football uses goals/assists/clean sheets (no inherited "points").
 */
export function getStatCardsBySport(
  sport: SportId,
  mode: "default" | "advanced" = "default"
): StatCard[] {
  const leaders = getStatLeadersBySport(sport);

  if (sport === "basketball") {
    if (mode === "advanced") {
      return [
        { title: "Points", leaders: leaders.goals, statIndex: 0 },
        { title: "Rebounds", leaders: leaders.passes, statIndex: 1 },
        { title: "3-Pointers", leaders: leaders.cleanSheets, statIndex: 2 },
        { title: "Assists", leaders: leaders.assists, statIndex: 3 },
        { title: "FG%", leaders: leaders.goals.map((l) => ({ ...l, value: 45 + (l.value % 10) })), statIndex: 4 },
      ];
    }
    return [
      { title: "PPG", leaders: perGameLeaders(leaders.goals), statIndex: 0 },
      { title: "RPG", leaders: perGameLeaders(leaders.passes), statIndex: 1 },
      { title: "3PG", leaders: perGameLeaders(leaders.cleanSheets), statIndex: 2 },
      { title: "FG%", leaders: leaders.goals.map((l) => ({ ...l, value: 0.45 + (l.value % 10) / 100 })), statIndex: 4 },
      { title: "APG", leaders: perGameLeaders(leaders.assists), statIndex: 3 },
    ];
  }

  const labels = getStatLabelsBySport(sport);
  const slots: StatCard[] = [
    { title: labels[0], leaders: leaders.goals, statIndex: 0 },
    { title: labels[1], leaders: leaders.assists, statIndex: 1 },
    { title: labels[2], leaders: leaders.passes, statIndex: 2 },
    { title: labels[3], leaders: leaders.cleanSheets, statIndex: 3 },
  ];
  if (sport === "football") {
    return [
      { title: "Goals", leaders: leaders.goals, statIndex: 0 },
      { title: "Assists", leaders: leaders.assists, statIndex: 1 },
      { title: "Clean Sheets", leaders: leaders.cleanSheets, statIndex: 3 },
    ];
  }
  return slots;
}

/** Format leader stat values per sport (e.g. track times in seconds). */
export function formatStatValue(sport: SportId, statIndex: number, value: number): string {
  if (sport === "track" && statIndex < 3) {
    return `${value.toFixed(2)}s`;
  }
  if (sport === "basketball" && statIndex === 4) {
    if (value < 1) return `.${Math.round(value * 1000).toString().padStart(3, "0")}`;
    return `.${Math.round(value * 10).toString().padStart(3, "0")}`;
  }
  if (sport === "basketball" && !Number.isInteger(value)) {
    return value.toFixed(1);
  }
  return String(value);
}

export { getSportConfig };
