import type { SportId } from "@/lib/utils/sport";
import type {
  MiniLeagueStructure,
  PhantomFormat,
  PhantomScoringMode,
  PhantomSettings,
} from "@/lib/phantom/types";

export interface FormatOption {
  id: PhantomFormat;
  title: string;
  blurb: string;
  sports: SportId[];
}

export const PHANTOM_FORMATS: FormatOption[] = [
  {
    id: "friendly",
    title: "Friendly",
    blurb: "One match — timed periods or a race to N goals.",
    sports: ["football", "basketball", "volleyball", "tennis"],
  },
  {
    id: "sets",
    title: "Beatrice Cup (Sets)",
    blurb: "Rotating sides — goals to win a set, time-draw both leave, track sets won.",
    sports: ["football", "basketball", "volleyball", "tennis"],
  },
  {
    id: "mini_league",
    title: "Mini league",
    blurb: "Up to 32 sides — single table or World Cup–style groups of 4.",
    sports: ["football", "basketball", "volleyball"],
  },
  {
    id: "penalties",
    title: "Football Penalty Shootout",
    blurb: "Straight to penalties — football only, no clock.",
    sports: ["football"],
  },
];

export function periodLabelFor(sport: SportId, format: PhantomFormat): string {
  if (format === "sets") return "Set";
  if (sport === "volleyball" || sport === "tennis") return "Set";
  if (sport === "basketball") return "Quarter";
  return "Half";
}

export function defaultScoringMode(format: PhantomFormat): PhantomScoringMode {
  if (format === "penalties") return "penalties";
  if (format === "sets") return "sets";
  return "timed";
}

export function suggestMiniLeagueStructure(teamCount: number): MiniLeagueStructure | null {
  if (teamCount >= 3 && teamCount <= 8) return "single_table";
  if (teamCount >= 12 && teamCount <= 32 && teamCount % 4 === 0) return "groups_of_4";
  return null;
}

export function validatePhantomSettings(settings: PhantomSettings): string | null {
  const names = settings.teams.map((t) => t.name.trim());
  if (names.some((n) => !n)) {
    const i = names.findIndex((n) => !n);
    return `Team ${i + 1} name is empty — enter a name for every side.`;
  }
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
    return "Team names must be unique.";
  }

  if (settings.format === "friendly" && settings.teams.length !== 2) {
    return "Friendly needs exactly 2 teams.";
  }
  if (settings.format === "penalties") {
    if (settings.sport !== "football") return "Football Penalty Shootout is football only.";
    if (settings.teams.length !== 2) return "Shootout needs exactly 2 teams.";
  }
  if (settings.format === "sets") {
    if (settings.teams.length < 3) {
      return "Beatrice Cup needs at least 3 teams in the rotation queue.";
    }
    if (settings.teams.length > 16) {
      return "Beatrice Cup supports at most 16 teams in the queue.";
    }
    const dur = settings.set_duration_minutes ?? 10;
    if (dur < 1 || dur > 60) return "Set duration must be between 1 and 60 minutes.";
    if (!settings.one_goal_throughout) {
      const first = settings.first_set_goals_to_win ?? 2;
      const next = settings.subsequent_set_goals_to_win ?? 1;
      if (first < 1 || next < 1) return "Goals to win a set must be at least 1.";
    }
  }
  if (settings.format === "mini_league") {
    const n = settings.teams.length;
    if (n < 3) return "Mini league needs at least 3 teams.";
    if (n > 32) return "Mini league supports at most 32 teams.";
    const structure =
      settings.mini_league_structure ?? suggestMiniLeagueStructure(n);
    if (!structure) {
      return `Team count ${n} is not supported. Use 3–8 for a single table, or 12/16/20/24/28/32 for groups of 4.`;
    }
    if (structure === "groups_of_4" && n % 4 !== 0) {
      return "Groups of 4 need a multiple of 4 teams (12, 16, 20, 24, 28, or 32).";
    }
  }
  if (settings.scoring_mode === "timed") {
    if (settings.period_minutes < 1) return "Period length must be at least 1 minute.";
    if (settings.period_count < 1) return "Need at least one period.";
  }
  if (settings.scoring_mode === "goals_only") {
    if (!settings.goal_target || settings.goal_target < 1) {
      return "Set a “first to” goal target of at least 1.";
    }
  }
  return null;
}

export function defaultSettings(sport: SportId, format: PhantomFormat): PhantomSettings {
  const period_label = periodLabelFor(sport, format);
  const scoring_mode = defaultScoringMode(format);
  const isSets = format === "sets";

  return {
    sport: format === "penalties" ? "football" : sport,
    format,
    scoring_mode,
    period_label,
    period_count: isSets ? 1 : sport === "basketball" ? 4 : 2,
    period_minutes: format === "penalties" ? 0 : isSets ? 10 : sport === "basketball" ? 10 : 20,
    best_of: 1,
    goal_target: null,
    track_assists: (format === "penalties" ? "football" : sport) === "football",
    teams: isSets
      ? [
          { id: "team-1", name: "Side 1" },
          { id: "team-2", name: "Side 2" },
          { id: "team-3", name: "Side 3" },
          { id: "team-4", name: "Side 4" },
        ]
      : [
          { id: "team-a", name: "Side A" },
          { id: "team-b", name: "Side B" },
        ],
    players: [],
    set_duration_minutes: 10,
    first_set_goals_to_win: 2,
    subsequent_set_goals_to_win: 1,
    one_goal_throughout: false,
    mini_league_structure: "single_table",
  };
}

export function goalsToWinForSet(settings: PhantomSettings, setNumber: number): number {
  if (settings.one_goal_throughout) return 1;
  if (setNumber <= 1) return settings.first_set_goals_to_win ?? 2;
  return settings.subsequent_set_goals_to_win ?? 1;
}

export function setUnitLabel(settings: PhantomSettings): string {
  return settings.period_label;
}

export function formatBestOfLabel(bestOf: number, unit: string): string {
  if (bestOf <= 1) return `Single ${unit.toLowerCase()}`;
  return `Best of ${bestOf} ${unit.toLowerCase()}s`;
}
