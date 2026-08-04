import type { SportId } from "@/lib/utils/sport";
import type { PhantomFormat, PhantomScoringMode, PhantomSettings } from "@/lib/phantom/types";

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
    title: "Sets",
    blurb: "Best-of series with named sets or periods.",
    sports: ["football", "basketball", "volleyball", "tennis"],
  },
  {
    id: "mini_league",
    title: "Mini league",
    blurb: "3–6 sides, round-robin table, quick fixtures.",
    sports: ["football", "basketball", "volleyball"],
  },
  {
    id: "penalties",
    title: "Shootout",
    blurb: "Straight to penalties — no clock, pure pressure.",
    sports: ["football"],
  },
];

export function periodLabelFor(sport: SportId, format: PhantomFormat): string {
  if (format === "sets" || sport === "volleyball" || sport === "tennis") return "Set";
  if (sport === "basketball") return "Quarter";
  return "Half";
}

export function defaultScoringMode(format: PhantomFormat): PhantomScoringMode {
  if (format === "penalties") return "penalties";
  if (format === "sets") return "sets";
  return "timed";
}

export function defaultSettings(sport: SportId, format: PhantomFormat): PhantomSettings {
  const period_label = periodLabelFor(sport, format);
  const scoring_mode = defaultScoringMode(format);

  return {
    sport,
    format,
    scoring_mode,
    period_label,
    period_count: format === "sets" ? 1 : sport === "basketball" ? 4 : 2,
    period_minutes: format === "penalties" ? 0 : sport === "basketball" ? 10 : 20,
    best_of: format === "sets" ? 3 : 1,
    goal_target: null,
    track_assists: sport === "football",
    teams: [
      { id: "team-a", name: "Side A" },
      { id: "team-b", name: "Side B" },
    ],
    players: [],
  };
}

export function setUnitLabel(settings: PhantomSettings): string {
  return settings.period_label;
}

export function formatBestOfLabel(bestOf: number, unit: string): string {
  if (bestOf <= 1) return `Single ${unit.toLowerCase()}`;
  return `Best of ${bestOf} ${unit.toLowerCase()}s`;
}
