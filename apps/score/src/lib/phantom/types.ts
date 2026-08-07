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

export type MiniLeagueStructure = "single_table" | "groups_of_4";

export interface PhantomTeam {
  id: string;
  name: string;
  /** Group letter when mini_league uses groups_of_4 */
  group?: string | null;
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
  period_label: string;
  period_count: number;
  period_minutes: number;
  /** Legacy best-of (unused for Beatrice sets) */
  best_of: number;
  goal_target: number | null;
  track_assists: boolean;
  teams: PhantomTeam[];
  players: PhantomPlayer[];
  /** Beatrice Cup / rotating sets */
  set_duration_minutes?: number;
  first_set_goals_to_win?: number;
  subsequent_set_goals_to_win?: number;
  one_goal_throughout?: boolean;
  /** Mini league layout */
  mini_league_structure?: MiniLeagueStructure;
  /** Rotation queue (team ids) for sets format — pick order */
  rotation_queue?: string[];
}

export interface PhantomEvent {
  id: string;
  match_id: string;
  team_id: string;
  type: "goal" | "assist" | "penalty_scored" | "penalty_missed" | "period_end" | "set_end";
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
  home_sets: number;
  away_sets: number;
  status: "scheduled" | "live" | "completed";
  current_period: number;
  home_penalties?: number;
  away_penalties?: number;
  /** Beatrice set number (1-based) */
  set_number?: number;
  group?: string | null;
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
  /** Football / league: W=3 D=1 L=0. Beatrice sets: points = sets won. */
  points: number;
  group?: string | null;
}

export interface PhantomSession {
  id: string;
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
  /** Live rotation queue for Beatrice sets */
  rotation_queue?: string[];
  /** Next set number to assign */
  next_set_number?: number;
}

export interface CreatePhantomInput {
  title?: string;
  settings: PhantomSettings;
}
