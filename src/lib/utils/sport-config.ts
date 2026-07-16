import type { SportId } from "@/lib/utils/sport";

export interface SportConfig {
  label: string;
  tournament: string;
  season: string;
  matchesTitle: string;
  dateNavLabel: string;
  dateNavRange: string;
  roundFilter: string;
  homeAwayFilter: string;
  clubsLabel: string;
  scoreUnit: "goals" | "points" | "sets" | "event";
  showDraw: boolean;
  isEventSport: boolean;
  playerStats: { label: string; value: (position: string) => number }[];
}

export const SPORT_CONFIG: Record<SportId, SportConfig> = {
  football: {
    label: "Football",
    tournament: "Inter-Faculty League",
    season: "2025/26",
    matchesTitle: "Inter-Faculty League Matches 2025/26",
    dateNavLabel: "Matchweek 9",
    dateNavRange: "Fri 14 Mar – Thu 20 Mar",
    roundFilter: "All Matchweeks",
    homeAwayFilter: "Home & Away",
    clubsLabel: "Clubs",
    scoreUnit: "goals",
    showDraw: true,
    isEventSport: false,
    playerStats: [
      { label: "Appearances", value: () => 8 },
      { label: "Goals", value: (p) => (p === "Forward" ? 6 : 0) },
      { label: "Assists", value: (p) => (p === "Midfielder" ? 4 : 1) },
      { label: "Cards", value: (p) => (p === "Defender" ? 3 : 1) },
    ],
  },
  basketball: {
    label: "Basketball",
    tournament: "Campus Basketball League",
    season: "2025/26",
    matchesTitle: "Campus Basketball League 2025/26",
    dateNavLabel: "Week 12",
    dateNavRange: "Mon 10 Mar – Sun 16 Mar",
    roundFilter: "All Weeks",
    homeAwayFilter: "Home & Away",
    clubsLabel: "Teams",
    scoreUnit: "points",
    showDraw: false,
    isEventSport: false,
    playerStats: [
      { label: "Games", value: () => 10 },
      { label: "Points", value: (p) => (p === "Guard" ? 284 : 195) },
      { label: "Rebounds", value: (p) => (p === "Guard" ? 48 : 72) },
      { label: "Assists", value: (p) => (p === "Guard" ? 89 : 58) },
    ],
  },
  tennis: {
    label: "Tennis",
    tournament: "Campus Tennis Open",
    season: "2025/26",
    matchesTitle: "Campus Tennis Open 2025/26",
    dateNavLabel: "Round 3",
    dateNavRange: "Wed 12 Mar – Sat 15 Mar",
    roundFilter: "All Rounds",
    homeAwayFilter: "Singles & Doubles",
    clubsLabel: "Clubs",
    scoreUnit: "sets",
    showDraw: false,
    isEventSport: false,
    playerStats: [
      { label: "Matches", value: () => 6 },
      { label: "Match Wins", value: (p) => (p === "Singles" ? 8 : 4) },
      { label: "Set Wins", value: (p) => (p === "Singles" ? 18 : 11) },
      { label: "Aces", value: (p) => (p === "Singles" ? 42 : 27) },
    ],
  },
  track: {
    label: "Track & Field",
    tournament: "Campus Track Championships",
    season: "2025/26",
    matchesTitle: "Campus Track Championships 2025/26",
    dateNavLabel: "Day 2",
    dateNavRange: "Fri 14 Mar – Sat 15 Mar",
    roundFilter: "All Events",
    homeAwayFilter: "All Categories",
    clubsLabel: "Athletes",
    scoreUnit: "event",
    showDraw: false,
    isEventSport: true,
    playerStats: [
      { label: "Events", value: () => 4 },
      { label: "Gold", value: (p) => (p === "Sprinter" ? 3 : 1) },
      { label: "Silver", value: (p) => (p === "Sprinter" ? 1 : 0) },
      { label: "Points", value: (p) => (p === "Sprinter" ? 30 : 15) },
    ],
  },
  volleyball: {
    label: "Volleyball",
    tournament: "Campus Volleyball League",
    season: "2025/26",
    matchesTitle: "Campus Volleyball League 2025/26",
    dateNavLabel: "Matchday 5",
    dateNavRange: "Thu 13 Mar – Sun 16 Mar",
    roundFilter: "All Matchdays",
    homeAwayFilter: "Home & Away",
    clubsLabel: "Teams",
    scoreUnit: "sets",
    showDraw: false,
    isEventSport: false,
    playerStats: [
      { label: "Matches", value: () => 8 },
      { label: "Kills", value: (p) => (p === "Outside Hitter" ? 86 : 62) },
      { label: "Blocks", value: (p) => (p === "Middle Blocker" ? 28 : 14) },
      { label: "Aces", value: (p) => (p === "Setter" ? 22 : 11) },
    ],
  },
};

export function getSportConfig(sport: SportId): SportConfig {
  return SPORT_CONFIG[sport];
}

export function scoreUnitLabel(unit: SportConfig["scoreUnit"]): string | null {
  switch (unit) {
    case "sets":
      return "Sets";
    case "points":
      return "Pts";
    default:
      return null;
  }
}
