export type UserRole =
  | "platform_owner"
  | "super_admin"
  | "admin"
  | "record_keeper"
  | "student";

export type CompetitionFormat = "team_vs_team" | "individual" | "relay";
export type MatchScope = "official" | "pickup";
export type MatchVariant = "standard" | "singles" | "doubles" | "relay";
export type CompetitionPhase =
  | "group_stage"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export interface FootballRules {
  extra_time?: boolean;
  penalty_shootout?: boolean;
  /** If true, go straight to pens when drawn after 90 min (no extra time) */
  penalties_after_full_time?: boolean;
  overtime?: boolean;
}

export interface BracketFixture {
  id: string;
  round: CompetitionPhase;
  round_label: string;
  match_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: "scheduled" | "live" | "completed" | "tbd";
  scheduled_at: string | null;
  /** Individual bracket (tennis singles) */
  home_player_id?: string | null;
  away_player_id?: string | null;
  home_subtitle?: string | null;
  away_subtitle?: string | null;
  home_avatar_url?: string | null;
  away_avatar_url?: string | null;
  bracket_mode?: "team" | "player";
}

export interface MeetEventFixture {
  id: string;
  event_name: string;
  category: string;
  match_id: string | null;
  status: "scheduled" | "live" | "completed";
  scheduled_at: string | null;
  venue?: string | null;
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
  /** Upcoming league opponent — football & basketball leagues only */
  next_match?: NextMatchInfo | null;
}

export interface NextMatchInfo {
  opponent_team_id: string;
  opponent_name: string;
  short_code: string;
  logo_url?: string | null;
}

export interface GroupStandingRow extends StandingRow {
  group_id: string;
  group_name: string;
}

export interface CompetitionTimelinePhase {
  phase: CompetitionPhase;
  label: string;
  status: "completed" | "active" | "upcoming";
  fixture_count: number;
  completed_count: number;
}

export interface PeriodScore {
  period: string;
  label: string;
  home_score: number;
  away_score: number;
}

export interface SetScore {
  set_number: number;
  home_games: number;
  away_games: number;
  tiebreak?: boolean;
}

export interface TrackResult {
  rank: number;
  lane: number;
  player_id: string;
  athlete_name: string;
  department_code: string;
  time_ms: number;
  time_display: string;
  avatar_url?: string | null;
  status?: "finished" | "dnf" | "false_start" | "dns";
}

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

export interface Venue {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  deleted_at: string | null;
  /** football | basketball | tennis | track | volleyball */
  sport_slug?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  department_id: string | null;
  sport_id: string;
  name: string;
  logo_url: string | null;
  department?: Department;
  sport?: Sport;
  /** External opponent (e.g. a visiting university) not tied to an AU department */
  is_guest?: boolean;
  /** Institution name shown in place of a department for guest teams */
  institution?: string | null;
  deleted_at?: string | null;
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

export interface TitleHolder {
  team_id?: string | null;
  team_name: string;
  /** Season they won, e.g. "2024/25" */
  season: string;
  logo_url?: string | null;
  short_code?: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  sport_id: string;
  category: "league" | "knockout_cup" | "group_knockout" | "friendly";
  format?: "league" | "group_knockout" | "knockout_only";
  /** league → Team of the Season; cup → Team of the Tournament; event → manual fixtures */
  competition_type?: "league" | "cup" | "event";
  title_holder?: TitleHolder | null;
  rules: FootballRules;
  season: string;
  phases?: CompetitionTimelinePhase[];
  /** Hidden from public/keepers until published. */
  is_draft?: boolean;
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
  competition_format?: CompetitionFormat;
  match_variant?: MatchVariant;
  competition_phase?: CompetitionPhase;
  group_id?: string | null;
  scope?: MatchScope;
  venue_id?: string | null;
  venue?: Venue | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  went_to_extra_time?: boolean;
  /** If drawn after 90, continue to extra time (cup / knockout style). */
  allows_extra_time?: boolean;
  /** If still level (after ET or after 90 when no ET), go to pens. */
  allows_penalty_shootout?: boolean;
  /** Simple pre-match lineup sheet / graphic URL. */
  lineup_image_url?: string | null;
  deleted_at?: string | null;
  home_team?: Team;
  away_team?: Team;
  tournament?: Tournament;
  sport?: Sport;
  period_scores?: PeriodScore[];
  set_scores?: SetScore[];
  track_results?: TrackResult[];
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
