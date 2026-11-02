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
  showWinProbability: boolean;
  isEventSport: boolean;
  competitionFormat: "team_vs_team" | "individual" | "relay";
  playerStats: { label: string; value: (position: string) => number }[];
}

export const SPORT_CONFIG: Record<SportId, SportConfig> = {
  football: {
    label: "Football",
    tournament: "All Competitions",
    season: "2025/26",
    matchesTitle: "Football Matches 2025/26",
    dateNavLabel: "Matchweek 9",
    dateNavRange: "Fri 14 Mar – Thu 20 Mar",
    roundFilter: "All Matchweeks",
    homeAwayFilter: "Home & Away",
    clubsLabel: "Clubs",
    scoreUnit: "goals",
    showDraw: true,
    showWinProbability: true,
    isEventSport: false,
    competitionFormat: "team_vs_team",
    playerStats: [
      { label: "Appearances", value: () => 8 },
      { label: "Goals", value: (p) => (p === "Forward" ? 6 : 0) },
      { label: "Assists", value: (p) => (p === "Midfielder" ? 4 : 1) },
      { label: "Cards", value: (p) => (p === "Defender" ? 3 : 1) },
    ],
  },
  basketball: {
    label: "Basketball",
    tournament: "All Competitions",
    season: "2025/26",
    matchesTitle: "Basketball Matches 2025/26",
    dateNavLabel: "Week 12",
    dateNavRange: "Mon 10 Mar – Sun 16 Mar",
    roundFilter: "All Weeks",
    homeAwayFilter: "Home & Away",
    clubsLabel: "Teams",
    scoreUnit: "points",
    showDraw: false,
    showWinProbability: true,
    isEventSport: false,
    competitionFormat: "team_vs_team",
    playerStats: [
      { label: "Games", value: () => 10 },
      { label: "PPG", value: (p) => (p === "Guard" ? 28.4 : 19.5) },
      { label: "RPG", value: (p) => (p === "Guard" ? 4.8 : 7.2) },
      { label: "APG", value: (p) => (p === "Guard" ? 8.9 : 5.8) },
      { label: "3PG", value: (p) => (p === "Guard" ? 3.1 : 1.4) },
      { label: "FG%", value: () => 0.462 },
    ],
  },
  tennis: {
    label: "Tennis",
    tournament: "All Competitions",
    season: "2025/26",
    matchesTitle: "Tennis Matches 2025/26",
    dateNavLabel: "Round 3",
    dateNavRange: "Wed 12 Mar – Sat 15 Mar",
    roundFilter: "All Rounds",
    homeAwayFilter: "Singles & Doubles",
    clubsLabel: "Clubs",
    scoreUnit: "sets",
    showDraw: false,
    showWinProbability: false,
    isEventSport: false,
    competitionFormat: "individual",
    playerStats: [
      { label: "Matches", value: () => 6 },
      { label: "Match Wins", value: (p) => (p === "Singles" ? 8 : 4) },
      { label: "Set Wins", value: (p) => (p === "Singles" ? 18 : 11) },
      { label: "Aces", value: (p) => (p === "Singles" ? 42 : 27) },
    ],
  },
  track: {
    label: "Track & Field",
    tournament: "All Competitions",
    season: "2025/26",
    matchesTitle: "Track & Field Events 2025/26",
    dateNavLabel: "Day 2",
    dateNavRange: "Fri 14 Mar – Sat 15 Mar",
    roundFilter: "All Events",
    homeAwayFilter: "All Categories",
    clubsLabel: "Athletes",
    scoreUnit: "event",
    showDraw: false,
    showWinProbability: false,
    isEventSport: true,
    competitionFormat: "relay",
    playerStats: [
      { label: "Events", value: () => 4 },
      { label: "Gold", value: (p) => (p === "Sprinter" ? 3 : 1) },
      { label: "Silver", value: (p) => (p === "Sprinter" ? 1 : 0) },
      { label: "Points", value: (p) => (p === "Sprinter" ? 30 : 15) },
    ],
  },
  volleyball: {
    label: "Volleyball",
    tournament: "All Competitions",
    season: "2025/26",
    matchesTitle: "Volleyball Matches 2025/26",
    dateNavLabel: "Matchday 5",
    dateNavRange: "Thu 13 Mar – Sun 16 Mar",
    roundFilter: "All Matchdays",
    homeAwayFilter: "Home & Away",
    clubsLabel: "Teams",
    scoreUnit: "sets",
    showDraw: false,
    showWinProbability: true,
    isEventSport: false,
    competitionFormat: "team_vs_team",
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
    case "goals":
      return "Goals";
    case "sets":
      return "Sets";
    case "points":
      return "Pts";
    default:
      return null;
  }
}

const PERIOD_LABELS: Record<SportId, Record<string, string>> = {
  football: {
    half_1: "1st half",
    half_time: "Half-time",
    half_2: "2nd half",
    full_time: "Full time",
    extra_time_1: "ET 1st",
    extra_time_2: "ET 2nd",
    penalty_shootout: "Penalties",
    not_started: "Kickoff",
  },
  basketball: {
    quarter_1: "Q1",
    quarter_2: "Q2",
    quarter_3: "Q3 08:42",
    quarter_4: "Q4",
    full_time: "Final",
    not_started: "Tip-off",
  },
  volleyball: {
    set_1: "Set 1",
    set_2: "Set 2",
    set_3: "Set 3",
    set_4: "Set 4",
    set_5: "Set 5",
    full_time: "Final",
    not_started: "First serve",
  },
  tennis: {
    set_1: "Set 1",
    set_2: "Set 2",
    set_3: "Set 3",
    full_time: "Final",
    not_started: "First serve",
  },
  track: {
    final: "Final in progress",
    heat: "Heat in progress",
    not_started: "Scheduled",
  },
};

export function livePeriodLabel(sport: SportId, period: string): string {
  return PERIOD_LABELS[sport][period] ?? period.replace(/_/g, " ");
}
