import { DEMO_STAT_LEADERS_FOOTBALL } from "@/lib/data/demo";
import { playerAvatarForId, logoForSportId } from "@/lib/utils/sport-assets";

export type AwardType =
  | "top_scorer"
  | "player_of_season"
  | "team_of_season"
  | "team_of_week";

export type LineupRole = "GK" | "DEF" | "MID" | "FWD" | "PLAYER";

/** One slot in a Team of the Week / Season formation lineup */
export interface AwardLineupPlayer {
  player_id: string;
  player_name: string;
  team_id?: string | null;
  team_code: string;
  team_logo_url?: string | null;
  role: LineupRole;
  rating: number;
  avatar_url?: string | null;
}

export interface SeasonAward {
  id: string;
  award_type: AwardType;
  season: string;
  sport_id: string;
  /** Competition the award belongs to — awards are per-competition, not per-sport */
  tournament_id?: string | null;
  week_number?: number | null;
  player_id?: string | null;
  team_id?: string | null;
  player_name?: string | null;
  team_name?: string | null;
  value?: number | string | null;
  label?: string | null;
  /** Formation lineup for team_of_week / team_of_season */
  lineup?: AwardLineupPlayer[] | null;
  published: boolean;
  published_at?: string | null;
}

const AWARD_LABELS: Record<AwardType, string> = {
  top_scorer: "Top Goal Scorer",
  player_of_season: "Player of the Season",
  team_of_season: "Team of the Season",
  team_of_week: "Team of the Week",
};

export function awardTypeLabel(type: AwardType): string {
  return AWARD_LABELS[type];
}

/**
 * League competitions crown a Team of the Season; cups a Team of the Tournament.
 * Player awards follow the same convention.
 */
export function awardTypeLabelFor(
  type: AwardType,
  competitionType: "league" | "cup" = "league"
): string {
  if (competitionType === "cup") {
    if (type === "team_of_season") return "Team of the Tournament";
    if (type === "player_of_season") return "Player of the Tournament";
  }
  return AWARD_LABELS[type];
}

export const ADMIN_AWARDS_STORAGE_KEY = "au-score-admin-awards";

export function loadAwardOverridesFromStorage(): SeasonAward[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADMIN_AWARDS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SeasonAward[];
  } catch {
    return [];
  }
}

export function saveAwardOverridesToStorage(overrides: SeasonAward[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_AWARDS_STORAGE_KEY, JSON.stringify(overrides));
}

/** Demo awards — admin can override via localStorage in demo mode */
function lp(
  player_id: string,
  player_name: string,
  team_code: string,
  role: LineupRole,
  rating: number
): AwardLineupPlayer {
  return {
    player_id,
    player_name,
    team_code,
    team_logo_url: logoForSportId("sport-football"),
    role,
    rating,
    avatar_url: playerAvatarForId(player_id),
  };
}

/** 4-3-3 XI used for football Team of the Week / Season demos */
const DEMO_FOOTBALL_TOTW_LINEUP: AwardLineupPlayer[] = [
  lp("pl-3", "Ngozi Adeyemi", "CSC", "GK", 7.52),
  lp("pl-5", "Fatima Ibrahim", "MEC", "DEF", 7.09),
  lp("pl-8", "Kelechi Okafor", "LAW", "DEF", 7.4),
  lp("pl-16", "Michael Okoro", "CSC", "DEF", 7.56),
  lp("pl-30", "Daniel Uche", "CSC", "DEF", 7.45),
  lp("pl-2", "Chidi Eze", "CSC", "MID", 7.76),
  lp("pl-6", "Emeka Nwosu", "EEE", "MID", 7.81),
  lp("pl-17", "Funke Adebayo", "CSC", "MID", 7.91),
  lp("pl-1", "Adaeze Okonkwo", "CSC", "FWD", 8.24),
  lp("pl-4", "Tunde Bakare", "MEC", "FWD", 7.9),
  lp("pl-7", "Amina Bello", "BIO", "FWD", 8.79),
];

const DEMO_FOOTBALL_TOTS_LINEUP: AwardLineupPlayer[] = [
  lp("pl-3", "Ngozi Adeyemi", "CSC", "GK", 7.61),
  lp("pl-35", "Mary Okon", "BIO", "DEF", 7.22),
  lp("pl-8", "Kelechi Okafor", "LAW", "DEF", 7.48),
  lp("pl-32", "Hassan Garba", "MEC", "DEF", 7.31),
  lp("pl-30", "Daniel Uche", "CSC", "DEF", 7.55),
  lp("pl-2", "Chidi Eze", "CSC", "MID", 7.7),
  lp("pl-33", "Rita Chukwu", "MEC", "MID", 7.42),
  lp("pl-17", "Funke Adebayo", "CSC", "MID", 7.88),
  lp("pl-1", "Adaeze Okonkwo", "CSC", "FWD", 8.41),
  lp("pl-34", "Peter Obi", "EEE", "FWD", 7.65),
  lp("pl-31", "Peace Nwankwo", "CSC", "FWD", 7.93),
];

export const DEMO_SEASON_AWARDS: SeasonAward[] = [
  {
    id: "aw-ts-1",
    award_type: "top_scorer",
    season: "2025/26",
    sport_id: "sport-football",
    player_id: "pl-1",
    player_name: "Adaeze Okonkwo",
    team_id: "team-csc-fc",
    team_name: "CSC FC",
    value: 6,
    label: "Golden Boot",
    published: true,
  },
  {
    id: "aw-pots-1",
    award_type: "player_of_season",
    season: "2025/26",
    sport_id: "sport-football",
    player_id: "pl-1",
    player_name: "Adaeze Okonkwo",
    team_id: "team-csc-fc",
    team_name: "CSC FC",
    value: null,
    published: true,
  },
  {
    id: "aw-tots-1",
    award_type: "team_of_season",
    season: "2025/26",
    sport_id: "sport-football",
    team_id: "team-csc-fc",
    team_name: "CSC FC",
    lineup: DEMO_FOOTBALL_TOTS_LINEUP,
    published: true,
    published_at: "2026-07-20",
  },
  {
    id: "aw-totw-1",
    award_type: "team_of_week",
    season: "2025/26",
    sport_id: "sport-football",
    week_number: 9,
    team_id: "team-mec-giants",
    team_name: "MEC Giants",
    lineup: DEMO_FOOTBALL_TOTW_LINEUP,
    published: true,
    published_at: "2026-07-20",
  },
  {
    id: "aw-ts-bb",
    award_type: "top_scorer",
    season: "2025/26",
    sport_id: "sport-basketball",
    player_id: "pl-9",
    player_name: "David Osei",
    team_id: "team-med-court",
    team_name: "Med Court Kings",
    value: 284,
    published: true,
  },
  {
    id: "aw-pots-tennis",
    award_type: "player_of_season",
    season: "2025/26",
    sport_id: "sport-tennis",
    player_id: "pl-10",
    player_name: "Zainab Yusuf",
    team_id: "team-csc-tennis",
    team_name: "CSC Tennis",
    published: true,
  },
];

export function computeTopScorerFromLeaders(sportId: string): SeasonAward | null {
  if (sportId !== "sport-football") return null;
  const top = DEMO_STAT_LEADERS_FOOTBALL.goals[0];
  if (!top) return null;
  return {
    id: "computed-top-scorer",
    award_type: "top_scorer",
    season: "2025/26",
    sport_id: sportId,
    player_id: top.player.id,
    player_name: `${top.player.first_name} ${top.player.last_name}`,
    team_id: null,
    team_name: top.teamName,
    value: top.value,
    published: true,
  };
}

export function roleFromPosition(position: string | null | undefined): LineupRole {
  const p = (position ?? "").toLowerCase();
  if (p.includes("goal")) return "GK";
  if (p.includes("def") || p.includes("back")) return "DEF";
  if (p.includes("mid")) return "MID";
  if (p.includes("forward") || p.includes("strik") || p.includes("wing")) return "FWD";
  return "PLAYER";
}

export function getAwardsForSport(
  sportDbId: string,
  overrides?: SeasonAward[],
  tournamentId?: string
): SeasonAward[] {
  const base = DEMO_SEASON_AWARDS.filter(
    (a) =>
      a.sport_id === sportDbId &&
      a.published &&
      (!tournamentId || !a.tournament_id || a.tournament_id === tournamentId)
  );
  if (overrides?.length) {
    const map = new Map(base.map((a) => [a.award_type + (a.week_number ?? ""), a]));
    for (const o of overrides) {
      map.set(o.award_type + (o.week_number ?? ""), o);
    }
    return Array.from(map.values());
  }
  return base;
}

export const AWARD_TYPE_OPTIONS: { id: AwardType; label: string; needsPlayer: boolean; needsTeam: boolean; needsWeek: boolean }[] = [
  { id: "top_scorer", label: "Top Goal Scorer", needsPlayer: true, needsTeam: true, needsWeek: false },
  { id: "player_of_season", label: "Player of the Season", needsPlayer: true, needsTeam: true, needsWeek: false },
  { id: "team_of_season", label: "Team of the Season", needsPlayer: false, needsTeam: true, needsWeek: false },
  { id: "team_of_week", label: "Team of the Week", needsPlayer: false, needsTeam: true, needsWeek: true },
];
