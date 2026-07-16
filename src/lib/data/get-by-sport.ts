import type { SportId } from "@/lib/utils/sport";
import type { Match, StandingRow } from "@/lib/types/database";
import type { StatLeader } from "@/components/stats/stat-leader-card";
import {
  DEMO_MATCHES,
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
} from "@/lib/data/demo";
import { getSportConfig } from "@/lib/utils/sport-config";
import { sportToDbId } from "@/lib/utils/sport";

export function getMatchesBySport(sport: SportId): Match[] {
  return DEMO_MATCHES.filter((m) => m.sport_id === sportToDbId(sport));
}

export function getStandingsBySport(sport: SportId): StandingRow[] {
  switch (sport) {
    case "basketball":
      return DEMO_STANDINGS_BASKETBALL;
    case "tennis":
      return DEMO_STANDINGS_TENNIS;
    case "track":
      return DEMO_STANDINGS_TRACK;
    case "volleyball":
      return DEMO_STANDINGS_VOLLEYBALL;
    default:
      return DEMO_STANDINGS_FOOTBALL;
  }
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

export { getSportConfig };
