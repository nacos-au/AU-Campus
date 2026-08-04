import type { SportId } from "@/lib/utils/sport";

/** Branded free-play product surface — off-book matches with shareable records. */
export const PHANTOM_BRAND = {
  name: "Phantom",
  tagline: "Off-book matches. On-record results.",
  path: "/phantom",
} as const;

export type PhantomFormat = "friendly" | "sets" | "mini_league" | "penalties";

/** How scoring advances during a match. */
export type PhantomScoringMode = "timed" | "goals_only" | "sets" | "penalties";

export type PhantomSessionStatus = "setup" | "live" | "completed";

export interface PhantomTeam {
  id: string;
  name: string;
}

export interface PhantomPlayer {
  id: string;
  team_id: string;
  name: string;
}

export interface PhantomSettings {
  sport: SportId;
  format: PhantomFormat;
  scoring_mode: PhantomScoringMode;
  /** Named periods: Halves / Quarters / Sets depending on sport + format */
  period_label: string;
  period_count: number;
  /** Minutes per period when timed (0 = ignore clock) */
  period_minutes: number;
  /** Best-of for sets format (1, 3, 5) */
  best_of: number;
  /** Target goals to win when goals_only */
  goal_target: number | null;
  track_assists: boolean;
  teams: PhantomTeam[];
  players: PhantomPlayer[];
}

export interface PhantomEvent {
  id: string;
  match_id: string;
  team_id: string;
  type: "goal" | "assist" | "penalty_scored" | "penalty_missed" | "period_end";
  player_name: string;
  assist_name?: string | null;
  period: number;
  clock_label: string;
  created_at: string;
}

export interface PhantomMatch {
  id: string;
  index: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  /** Set wins when scoring_mode is sets */
  home_sets: number;
  away_sets: number;
  status: "scheduled" | "live" | "completed";
  current_period: number;
  home_penalties?: number;
  away_penalties?: number;
}

export interface PhantomStandingRow {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

export interface PhantomSession {
  id: string;
  /** Short code for share URLs */
  code: string;
  status: PhantomSessionStatus;
  settings: PhantomSettings;
  matches: PhantomMatch[];
  events: PhantomEvent[];
  active_match_id: string | null;
  standings: PhantomStandingRow[];
  created_at: string;
  concluded_at: string | null;
  title: string;
}

export interface CreatePhantomInput {
  title?: string;
  settings: PhantomSettings;
}
