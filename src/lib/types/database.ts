export type UserRole = "super_admin" | "record_keeper" | "student";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "paused"
  | "completed"
  | "cancelled";

export type SportType = "team" | "individual";
export type ScoreType = "points" | "sets" | "time";

export interface Department {
  id: string;
  name: string;
  short_code: string;
  created_at: string;
}

export interface Sport {
  id: string;
  name: string;
  type: SportType;
  score_type: ScoreType;
}

export interface Team {
  id: string;
  department_id: string;
  sport_id: string;
  name: string;
  logo_url: string | null;
  department?: Department;
  sport?: Sport;
}

export interface Player {
  id: string;
  department_id: string;
  first_name: string;
  last_name: string;
  matric_number: string | null;
  avatar_url: string | null;
  position: string | null;
  department?: Department;
}

export interface Tournament {
  id: string;
  name: string;
  sport_id: string;
  category: "league" | "knockout_cup" | "friendly";
  rules: {
    extra_time?: boolean;
    penalty_shootout?: boolean;
    overtime?: boolean;
  };
  season: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  sport_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  status: MatchStatus;
  current_period: string;
  home_score: number;
  away_score: number;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  win_probability: WinProbability | null;
  home_team?: Team;
  away_team?: Team;
  tournament?: Tournament;
  sport?: Sport;
}

export interface WinProbability {
  algo: { home: number; draw: number; away: number };
  votes: { home: number; draw: number; away: number };
}

export interface MatchEvent {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  event_type: string;
  period: string;
  match_time: string;
  details: Record<string, unknown> | null;
  is_void: boolean;
  created_at: string;
  player?: Player;
}

export interface MatchVote {
  id: string;
  match_id: string;
  user_id: string;
  vote: "home" | "draw" | "away";
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  matric_number: string | null;
  department_id: string | null;
  role: UserRole;
  avatar_url: string | null;
}

export interface TeamEloRating {
  team_id: string;
  tournament_id: string;
  rating: number;
  updated_at: string;
}

export interface StandingRow {
  team_id: string;
  team_name: string;
  short_code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: ("W" | "D" | "L")[];
  logo_url?: string | null;
}
