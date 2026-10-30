import type {
  BracketFixture,
  CompetitionTimelinePhase,
  GroupStandingRow,
  MeetEventFixture,
  Tournament,
} from "@/lib/types/database";
import { playerAvatarForId, logoForSportId } from "@/lib/utils/sport-assets";
import { listCreatedDemoTournaments } from "@/lib/data/demo-competitions-store";

/** Achievers League — the football league competition (renamed from Inter-Faculty League) */
export const DEMO_LEAGUE_TOURNAMENT: Tournament = {
  id: "tourn-ifl-2026",
  name: "Achievers League",
  sport_id: "sport-football",
  category: "league",
  format: "league",
  competition_type: "league",
  title_holder: {
    team_id: "team-csc-fc",
    team_name: "CSC FC",
    season: "2024/25",
    short_code: "CSC",
  },
  rules: { extra_time: false, penalty_shootout: false },
  season: "2025/26",
};

export const DEMO_CUP_TOURNAMENT: Tournament = {
  id: "tourn-cup-2026",
  name: "Inter-Faculty Cup",
  sport_id: "sport-football",
  category: "group_knockout",
  format: "group_knockout",
  competition_type: "cup",
  title_holder: {
    team_id: "team-eee-strikers",
    team_name: "EEE Strikers",
    season: "2024/25",
    short_code: "EEE",
  },
  season: "2025/26",
  rules: {
    extra_time: true,
    penalty_shootout: true,
    penalties_after_full_time: false,
  },
  phases: [
    { phase: "group_stage", label: "Group Stage", status: "completed", fixture_count: 12, completed_count: 12 },
    { phase: "round_of_16", label: "Round of 16", status: "completed", fixture_count: 8, completed_count: 8 },
    { phase: "quarter_final", label: "Quarter-finals", status: "active", fixture_count: 4, completed_count: 2 },
    { phase: "semi_final", label: "Semi-finals", status: "upcoming", fixture_count: 2, completed_count: 0 },
    { phase: "final", label: "Final", status: "upcoming", fixture_count: 1, completed_count: 0 },
  ],
};

export const DEMO_DEANS_CUP_TOURNAMENT: Tournament = {
  id: "tourn-deans-cup-2026",
  name: "Deans Cup",
  sport_id: "sport-football",
  category: "knockout_cup",
  format: "knockout_only",
  competition_type: "cup",
  title_holder: {
    team_id: "team-mec-giants",
    team_name: "MEC Giants",
    season: "2024/25",
    short_code: "MEC",
  },
  season: "2025/26",
  rules: {
    extra_time: false,
    penalty_shootout: true,
    penalties_after_full_time: true,
  },
  phases: [
    { phase: "quarter_final", label: "Quarter-finals", status: "completed", fixture_count: 4, completed_count: 4 },
    { phase: "semi_final", label: "Semi-finals", status: "active", fixture_count: 2, completed_count: 1 },
    { phase: "final", label: "Final", status: "upcoming", fixture_count: 1, completed_count: 0 },
  ],
};

export const DEMO_BASKETBALL_TOURNAMENT: Tournament = {
  id: "tourn-bball-cup-2026",
  name: "Campus Basketball Playoffs 2026",
  sport_id: "sport-basketball",
  category: "group_knockout",
  format: "group_knockout",
  competition_type: "cup",
  title_holder: {
    team_id: "team-med-court",
    team_name: "Med Court Kings",
    season: "2024/25",
    short_code: "MED",
  },
  season: "2025/26",
  rules: { overtime: true },
  phases: [
    { phase: "group_stage", label: "Regular Season", status: "completed", fixture_count: 12, completed_count: 12 },
    { phase: "quarter_final", label: "Quarter-finals", status: "active", fixture_count: 4, completed_count: 1 },
    { phase: "semi_final", label: "Semi-finals", status: "upcoming", fixture_count: 2, completed_count: 0 },
    { phase: "final", label: "Championship", status: "upcoming", fixture_count: 1, completed_count: 0 },
  ],
};

export const DEMO_VOLLEYBALL_TOURNAMENT: Tournament = {
  id: "tourn-volley-cup-2026",
  name: "Campus Volleyball Playoffs 2026",
  sport_id: "sport-volleyball",
  category: "group_knockout",
  format: "group_knockout",
  competition_type: "cup",
  title_holder: {
    team_id: "team-csc-volley",
    team_name: "CSC Spikers",
    season: "2024/25",
    short_code: "CSC",
  },
  season: "2025/26",
  rules: {},
  phases: [
    { phase: "group_stage", label: "Pool Play", status: "completed", fixture_count: 10, completed_count: 10 },
    { phase: "semi_final", label: "Semi-finals", status: "active", fixture_count: 2, completed_count: 0 },
    { phase: "final", label: "Championship", status: "upcoming", fixture_count: 1, completed_count: 0 },
  ],
};

export const DEMO_TENNIS_TOURNAMENT: Tournament = {
  id: "tourn-tennis-2026",
  name: "Campus Tennis Open 2026",
  sport_id: "sport-tennis",
  category: "knockout_cup",
  format: "knockout_only",
  competition_type: "cup",
  title_holder: {
    team_id: null,
    team_name: "Zainab Yusuf",
    season: "2024/25",
    short_code: "CSC",
  },
  season: "2025/26",
  rules: {},
  phases: [
    { phase: "round_of_16", label: "Round of 16", status: "completed", fixture_count: 8, completed_count: 8 },
    { phase: "quarter_final", label: "Quarter-finals", status: "active", fixture_count: 4, completed_count: 2 },
    { phase: "semi_final", label: "Semi-finals", status: "upcoming", fixture_count: 2, completed_count: 0 },
    { phase: "final", label: "Final", status: "upcoming", fixture_count: 1, completed_count: 0 },
  ],
};

export const DEMO_TRACK_TOURNAMENT: Tournament = {
  id: "tourn-track-2026",
  name: "Campus Track Championships 2026",
  sport_id: "sport-track",
  category: "knockout_cup",
  format: "league",
  competition_type: "cup",
  title_holder: {
    team_id: null,
    team_name: "MEC Athletics",
    season: "2024/25",
    short_code: "MEC",
  },
  season: "2025/26",
  rules: {},
  phases: [
    { phase: "group_stage", label: "Day 1 — Heats", status: "completed", fixture_count: 12, completed_count: 12 },
    { phase: "semi_final", label: "Day 2 — Semi-finals", status: "active", fixture_count: 6, completed_count: 2 },
    { phase: "final", label: "Day 2 — Finals", status: "upcoming", fixture_count: 8, completed_count: 1 },
  ],
};

export const DEMO_BASKETBALL_LEAGUE_TOURNAMENT: Tournament = {
  id: "tourn-bball-league-2026",
  name: "Campus Basketball League",
  sport_id: "sport-basketball",
  category: "league",
  format: "league",
  competition_type: "league",
  title_holder: {
    team_id: "team-csc-hoops",
    team_name: "CSC Hoops",
    season: "2024/25",
    short_code: "CSC",
  },
  season: "2025/26",
  rules: { overtime: true },
  phases: [
    { phase: "group_stage", label: "Regular Season", status: "active", fixture_count: 24, completed_count: 14 },
  ],
};

export const DEMO_VOLLEYBALL_LEAGUE_TOURNAMENT: Tournament = {
  id: "tourn-volley-league-2026",
  name: "Campus Volleyball League",
  sport_id: "sport-volleyball",
  category: "league",
  format: "league",
  competition_type: "league",
  title_holder: {
    team_id: "team-eee-volley",
    team_name: "EEE Netters",
    season: "2024/25",
    short_code: "EEE",
  },
  season: "2025/26",
  rules: {},
  phases: [
    { phase: "group_stage", label: "Regular Season", status: "active", fixture_count: 20, completed_count: 12 },
  ],
};

export const DEMO_TENNIS_DOUBLES_TOURNAMENT: Tournament = {
  id: "tourn-tennis-doubles-2026",
  name: "Inter-Faculty Doubles Cup",
  sport_id: "sport-tennis",
  category: "knockout_cup",
  format: "knockout_only",
  competition_type: "cup",
  // Maiden edition — no title holder to show
  title_holder: null,
  season: "2025/26",
  rules: {},
  phases: [
    { phase: "quarter_final", label: "Quarter-finals", status: "upcoming", fixture_count: 4, completed_count: 0 },
    { phase: "semi_final", label: "Semi-finals", status: "upcoming", fixture_count: 2, completed_count: 0 },
    { phase: "final", label: "Doubles Final", status: "upcoming", fixture_count: 1, completed_count: 0 },
  ],
};

export const DEMO_TRACK_GP_TOURNAMENT: Tournament = {
  id: "tourn-track-gp-2026",
  name: "Athletics Grand Prix Series",
  sport_id: "sport-track",
  category: "league",
  format: "league",
  competition_type: "league",
  // Maiden edition — no title holder to show
  title_holder: null,
  season: "2025/26",
  rules: {},
  phases: [
    { phase: "group_stage", label: "Meet 1 — Opener", status: "completed", fixture_count: 10, completed_count: 10 },
    { phase: "semi_final", label: "Meet 2 — Mid-season", status: "active", fixture_count: 10, completed_count: 4 },
    { phase: "final", label: "Meet 3 — Finale", status: "upcoming", fixture_count: 10, completed_count: 0 },
  ],
};

export const DEMO_GROUP_STANDINGS: GroupStandingRow[] = [
  { group_id: "grp-a", group_name: "Group A", team_id: "team-csc-fc", team_name: "CSC FC", short_code: "CSC", played: 3, won: 2, drawn: 1, lost: 0, goals_for: 7, goals_against: 3, goal_difference: 4, points: 7, form: ["W", "D", "W"] },
  { group_id: "grp-a", group_name: "Group A", team_id: "team-mec-giants", team_name: "MEC Giants", short_code: "MEC", played: 3, won: 2, drawn: 0, lost: 1, goals_for: 6, goals_against: 4, goal_difference: 2, points: 6, form: ["W", "L", "W"] },
  { group_id: "grp-a", group_name: "Group A", team_id: "team-law-barristers", team_name: "Law Barristers", short_code: "LAW", played: 3, won: 0, drawn: 1, lost: 2, goals_for: 2, goals_against: 5, goal_difference: -3, points: 1, form: ["L", "D", "L"] },
  { group_id: "grp-a", group_name: "Group A", team_id: "team-bio-wolves", team_name: "Bio Wolves", short_code: "BIO", played: 3, won: 0, drawn: 0, lost: 3, goals_for: 1, goals_against: 8, goal_difference: -7, points: 0, form: ["L", "L", "L"] },
  { group_id: "grp-b", group_name: "Group B", team_id: "team-eee-strikers", team_name: "EEE Strikers", short_code: "EEE", played: 3, won: 2, drawn: 1, lost: 0, goals_for: 5, goals_against: 2, goal_difference: 3, points: 7, form: ["W", "D", "W"] },
  { group_id: "grp-b", group_name: "Group B", team_id: "team-csc-fc", team_name: "CSC FC", short_code: "CSC", played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0, form: [] },
];

export const DEMO_BASKETBALL_GROUP_STANDINGS: GroupStandingRow[] = [
  { group_id: "pool-east", group_name: "East Pool", team_id: "team-med-court", team_name: "Med Court Kings", short_code: "MED", played: 6, won: 5, drawn: 0, lost: 1, goals_for: 492, goals_against: 456, goal_difference: 36, points: 10, form: ["W", "W", "L", "W", "W"] },
  { group_id: "pool-east", group_name: "East Pool", team_id: "team-csc-hoops", team_name: "CSC Hoops", short_code: "CSC", played: 6, won: 4, drawn: 0, lost: 2, goals_for: 478, goals_against: 462, goal_difference: 16, points: 8, form: ["W", "L", "W", "W", "L"] },
  { group_id: "pool-west", group_name: "West Pool", team_id: "team-mec-hoops", team_name: "MEC Ballers", short_code: "MEC", played: 6, won: 4, drawn: 0, lost: 2, goals_for: 465, goals_against: 451, goal_difference: 14, points: 8, form: ["W", "W", "L", "W", "L"] },
  { group_id: "pool-west", group_name: "West Pool", team_id: "team-eee-hoops", team_name: "EEE Shooters", short_code: "EEE", played: 6, won: 1, drawn: 0, lost: 5, goals_for: 426, goals_against: 486, goal_difference: -60, points: 2, form: ["L", "L", "W", "L", "L"] },
];

export const DEMO_VOLLEYBALL_GROUP_STANDINGS: GroupStandingRow[] = [
  { group_id: "pool-a", group_name: "Pool A", team_id: "team-csc-volley", team_name: "CSC Spikers", short_code: "CSC", played: 4, won: 4, drawn: 0, lost: 0, goals_for: 12, goals_against: 4, goal_difference: 8, points: 12, form: ["W", "W", "W", "W"] },
  { group_id: "pool-a", group_name: "Pool A", team_id: "team-mec-volley", team_name: "MEC Volleys", short_code: "MEC", played: 4, won: 2, drawn: 0, lost: 2, goals_for: 8, goals_against: 8, goal_difference: 0, points: 6, form: ["W", "L", "W", "L"] },
  { group_id: "pool-a", group_name: "Pool A", team_id: "team-law-volley", team_name: "Law Servers", short_code: "LAW", played: 4, won: 0, drawn: 0, lost: 4, goals_for: 3, goals_against: 12, goal_difference: -9, points: 0, form: ["L", "L", "L", "L"] },
  { group_id: "pool-b", group_name: "Pool B", team_id: "team-eee-volley", team_name: "EEE Netters", short_code: "EEE", played: 4, won: 3, drawn: 0, lost: 1, goals_for: 10, goals_against: 6, goal_difference: 4, points: 9, form: ["W", "W", "L", "W"] },
  { group_id: "pool-b", group_name: "Pool B", team_id: "team-bio-volley", team_name: "Bio Blockers", short_code: "BIO", played: 4, won: 1, drawn: 0, lost: 3, goals_for: 5, goals_against: 10, goal_difference: -5, points: 3, form: ["L", "W", "L", "L"] },
];

function tennisPlayer(id: string, name: string, dept: string) {
  return {
    home_player_id: id,
    home_avatar_url: playerAvatarForId(id),
    home_subtitle: dept,
    home_team_name: name,
    bracket_mode: "player" as const,
  };
}

function tennisAway(id: string, name: string, dept: string) {
  return {
    away_player_id: id,
    away_avatar_url: playerAvatarForId(id),
    away_subtitle: dept,
    away_team_name: name,
  };
}

export const DEMO_TENNIS_BRACKET_FIXTURES: BracketFixture[] = [
  { id: "tn-r16-1", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-10", "Zainab Yusuf", "CSC"), ...tennisAway("pl-7", "Amina Bello", "BIO"), home_score: 2, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-05T10:00:00Z" },
  { id: "tn-r16-2", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-1", "Adaeze Okonkwo", "CSC"), ...tennisAway("pl-18", "Nneka Okafor", "LAW"), home_score: 2, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-05T11:30:00Z" },
  { id: "tn-r16-3", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-4", "Tunde Bakare", "MEC"), ...tennisAway("pl-20", "Samuel Adeyemi", "EEE"), home_score: 2, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-05T14:00:00Z" },
  { id: "tn-r16-4", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-5", "Fatima Ibrahim", "MEC"), ...tennisAway("pl-12", "Grace Etim", "BIO"), home_score: 1, away_score: 2, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-05T15:30:00Z" },
  { id: "tn-r16-5", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-9", "David Osei", "MED"), ...tennisAway("pl-13", "Chinwe Okafor", "CSC"), home_score: 2, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-06T10:00:00Z" },
  { id: "tn-r16-6", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-14", "Ibrahim Musa", "MEC"), ...tennisAway("pl-15", "Blessing Udoh", "EEE"), home_score: 0, away_score: 2, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-06T11:30:00Z" },
  { id: "tn-r16-7", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-8", "Kelechi Okafor", "LAW"), ...tennisAway("pl-6", "Emeka Nwosu", "EEE"), home_score: 2, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-06T14:00:00Z" },
  { id: "tn-r16-8", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-11", "James Adebola", "MEC"), ...tennisAway("pl-3", "Ngozi Adeyemi", "CSC"), home_score: 1, away_score: 2, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-06T15:30:00Z" },
  { id: "tn-qf-1", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-10", "Zainab Yusuf", "CSC"), ...tennisAway("pl-1", "Adaeze Okonkwo", "CSC"), home_score: 2, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-12T10:00:00Z" },
  { id: "tn-qf-2", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-4", "Tunde Bakare", "MEC"), ...tennisAway("pl-12", "Grace Etim", "BIO"), home_score: 2, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-12T12:00:00Z" },
  { id: "tn-qf-3", round: "quarter_final", round_label: "Quarter-final", match_id: "match-16", home_team_id: null, away_team_id: null, ...tennisPlayer("pl-9", "David Osei", "MED"), ...tennisAway("pl-15", "Blessing Udoh", "EEE"), home_score: 2, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-12T14:00:00Z" },
  { id: "tn-qf-4", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-8", "Kelechi Okafor", "LAW"), ...tennisAway("pl-3", "Ngozi Adeyemi", "CSC"), home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled", scheduled_at: "2026-03-13T10:00:00Z" },
  { id: "tn-sf-1", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: null, away_team_id: null, ...tennisPlayer("pl-10", "Zainab Yusuf", "CSC"), ...tennisAway("pl-4", "Tunde Bakare", "MEC"), home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled", scheduled_at: "2026-03-20T10:00:00Z" },
  { id: "tn-sf-2", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: null, away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "player" },
  { id: "tn-final", round: "final", round_label: "Singles Final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: null, away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "player" },
];

export const DEMO_DEANS_CUP_FIXTURES: BracketFixture[] = [
  { id: "dc-qf-1", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: "team-csc-fc", away_team_id: "team-eee-strikers", home_team_name: "CSC FC", away_team_name: "EEE Strikers", home_score: 1, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-02-10T15:00:00Z", bracket_mode: "team" },
  { id: "dc-qf-2", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: "team-mec-giants", away_team_id: "team-law-barristers", home_team_name: "MEC Giants", away_team_name: "Law Barristers", home_score: 2, away_score: 2, home_penalties: 5, away_penalties: 4, status: "completed", scheduled_at: "2026-02-10T17:00:00Z", bracket_mode: "team" },
  { id: "dc-qf-3", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: "team-bio-wolves", away_team_id: null, home_team_name: "Bio Wolves", away_team_name: "Pharm FC", home_score: 3, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-02-11T15:00:00Z", bracket_mode: "team" },
  { id: "dc-qf-4", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Med Hall", away_team_name: "Arts FC", home_score: 0, away_score: 2, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-02-11T17:00:00Z", bracket_mode: "team" },
  { id: "dc-sf-1", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: "team-csc-fc", away_team_id: "team-mec-giants", home_team_name: "CSC FC", away_team_name: "MEC Giants", home_score: 2, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-08T15:00:00Z", bracket_mode: "team" },
  { id: "dc-sf-2", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: "team-bio-wolves", away_team_id: null, home_team_name: "Bio Wolves", away_team_name: "Arts FC", home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled", scheduled_at: "2026-03-28T15:00:00Z", bracket_mode: "team" },
  { id: "dc-final", round: "final", round_label: "Final", match_id: null, home_team_id: "team-csc-fc", away_team_id: null, home_team_name: "CSC FC", away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "team" },
];

export const DEMO_BRACKET_FIXTURES: BracketFixture[] = [
  { id: "br-r16-1", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: "team-csc-fc", away_team_id: "team-law-barristers", home_team_name: "CSC FC", away_team_name: "Law Barristers", home_score: 3, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-01T14:00:00Z", bracket_mode: "team" },
  { id: "br-r16-2", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: "team-mec-giants", away_team_id: "team-bio-wolves", home_team_name: "MEC Giants", away_team_name: "Bio Wolves", home_score: 2, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-01T16:00:00Z", bracket_mode: "team" },
  { id: "br-r16-3", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: "team-eee-strikers", away_team_id: null, home_team_name: "EEE Strikers", away_team_name: "Pharm FC", home_score: 2, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-02T14:00:00Z", bracket_mode: "team" },
  { id: "br-r16-4", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Eng Tech", away_team_name: "Agric FC", home_score: 1, away_score: 2, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-02T16:00:00Z", bracket_mode: "team" },
  { id: "br-r16-5", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Med Hall", away_team_name: "Bus FC", home_score: 2, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-03T14:00:00Z", bracket_mode: "team" },
  { id: "br-r16-6", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Pharm FC", away_team_name: "Vet FC", home_score: 3, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-03T16:00:00Z", bracket_mode: "team" },
  { id: "br-r16-7", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Arts FC", away_team_name: "Agric Eng", home_score: 2, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-04T14:00:00Z", bracket_mode: "team" },
  { id: "br-r16-8", round: "round_of_16", round_label: "Round of 16", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Fin FC", away_team_name: "Lib FC", home_score: 0, away_score: 2, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-04T16:00:00Z", bracket_mode: "team" },
  { id: "br-qf-1", round: "quarter_final", round_label: "Quarter-final", match_id: "match-15", home_team_id: "team-csc-fc", away_team_id: "team-mec-giants", home_team_name: "CSC FC", away_team_name: "MEC Giants", home_score: 2, away_score: 2, home_penalties: 4, away_penalties: 3, status: "completed", scheduled_at: "2026-03-10T15:00:00Z", bracket_mode: "team" },
  { id: "br-qf-2", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: "team-eee-strikers", away_team_id: null, home_team_name: "EEE Strikers", away_team_name: "Agric FC", home_score: 1, away_score: 0, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-10T17:00:00Z", bracket_mode: "team" },
  { id: "br-qf-3", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Med Hall", away_team_name: "Pharm FC", home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled", scheduled_at: "2026-03-11T15:00:00Z", bracket_mode: "team" },
  { id: "br-qf-4", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: "Arts FC", away_team_name: "Lib FC", home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled", scheduled_at: "2026-03-11T17:00:00Z", bracket_mode: "team" },
  { id: "br-sf-1", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: "team-csc-fc", away_team_id: "team-eee-strikers", home_team_name: "CSC FC", away_team_name: "EEE Strikers", home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled", scheduled_at: "2026-03-20T15:00:00Z", bracket_mode: "team" },
  { id: "br-sf-2", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: null, away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "team" },
  { id: "br-final", round: "final", round_label: "Final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: null, away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "team" },
];

export const DEMO_BASKETBALL_BRACKET_FIXTURES: BracketFixture[] = [
  { id: "bb-qf-1", round: "quarter_final", round_label: "Quarter-final", match_id: "match-4", home_team_id: "team-csc-hoops", away_team_id: "team-med-court", home_team_name: "CSC Hoops", away_team_name: "Med Court Kings", home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "live", scheduled_at: "2026-03-14T16:00:00Z", bracket_mode: "team" },
  { id: "bb-qf-2", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: "team-mec-hoops", away_team_id: "team-eee-hoops", home_team_name: "MEC Ballers", away_team_name: "EEE Shooters", home_score: 78, away_score: 65, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-14T14:00:00Z", bracket_mode: "team" },
  { id: "bb-qf-3", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: "team-med-court", away_team_id: "team-eee-hoops", home_team_name: "Med Court Kings", away_team_name: "EEE Shooters", home_score: 82, away_score: 71, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-13T16:00:00Z", bracket_mode: "team" },
  { id: "bb-qf-4", round: "quarter_final", round_label: "Quarter-final", match_id: null, home_team_id: "team-csc-hoops", away_team_id: "team-mec-hoops", home_team_name: "CSC Hoops", away_team_name: "MEC Ballers", home_score: 72, away_score: 68, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-13T14:00:00Z", bracket_mode: "team" },
  { id: "bb-sf-1", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: "team-med-court", away_team_id: "team-mec-hoops", home_team_name: "Med Court Kings", away_team_name: "MEC Ballers", home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled", scheduled_at: "2026-03-21T16:00:00Z", bracket_mode: "team" },
  { id: "bb-sf-2", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: null, away_team_id: null, home_team_name: null, away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "team" },
  { id: "bb-final", round: "final", round_label: "Championship", match_id: null, home_team_id: null, away_team_id: null, home_team_name: null, away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "team" },
];

export const DEMO_VOLLEYBALL_BRACKET_FIXTURES: BracketFixture[] = [
  { id: "vb-sf-1", round: "semi_final", round_label: "Semi-final", match_id: "match-12", home_team_id: "team-csc-volley", away_team_id: "team-eee-volley", home_team_name: "CSC Spikers", away_team_name: "EEE Netters", home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "live", scheduled_at: "2026-03-15T14:00:00Z", bracket_mode: "team" },
  { id: "vb-sf-2", round: "semi_final", round_label: "Semi-final", match_id: null, home_team_id: "team-mec-volley", away_team_id: "team-bio-volley", home_team_name: "MEC Volleys", away_team_name: "Bio Blockers", home_score: 3, away_score: 1, home_penalties: null, away_penalties: null, status: "completed", scheduled_at: "2026-03-15T12:00:00Z", bracket_mode: "team" },
  { id: "vb-final", round: "final", round_label: "Championship", match_id: null, home_team_id: null, away_team_id: null, home_team_name: null, away_team_name: null, home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "tbd", scheduled_at: null, bracket_mode: "team" },
];

export const DEMO_TRACK_MEET_EVENTS: MeetEventFixture[] = [
  { id: "tr-heat-1", event_name: "100m Men — Heat 1", category: "Sprints", match_id: null, status: "completed", scheduled_at: "2026-03-14T09:00:00Z", venue: "Main Track" },
  { id: "tr-heat-2", event_name: "100m Men — Heat 2", category: "Sprints", match_id: null, status: "completed", scheduled_at: "2026-03-14T09:15:00Z", venue: "Main Track" },
  { id: "tr-heat-3", event_name: "100m Women — Heat 1", category: "Sprints", match_id: null, status: "completed", scheduled_at: "2026-03-14T09:30:00Z", venue: "Main Track" },
  { id: "tr-semi-1", event_name: "400m Men — Semi-final", category: "Sprints", match_id: null, status: "completed", scheduled_at: "2026-03-15T10:00:00Z", venue: "Main Track" },
  { id: "tr-semi-2", event_name: "400m Women — Semi-final", category: "Sprints", match_id: null, status: "live", scheduled_at: "2026-03-15T10:20:00Z", venue: "Main Track" },
  { id: "tr-final-1", event_name: "100m Men Final", category: "Sprints", match_id: "match-10", status: "live", scheduled_at: "2026-03-15T14:00:00Z", venue: "Main Track" },
  { id: "tr-final-2", event_name: "400m Women Final", category: "Sprints", match_id: "match-11", status: "scheduled", scheduled_at: "2026-03-15T15:00:00Z", venue: "Main Track" },
  { id: "tr-final-3", event_name: "4×100m Relay Final", category: "Relays", match_id: null, status: "scheduled", scheduled_at: "2026-03-15T16:00:00Z", venue: "Main Track" },
];

export function getGroupStandings(groupId?: string): GroupStandingRow[] {
  if (!groupId) return DEMO_GROUP_STANDINGS;
  return DEMO_GROUP_STANDINGS.filter((r) => r.group_id === groupId);
}

export function getGroupStandingsForSport(sportDbId: string): GroupStandingRow[] {
  switch (sportDbId) {
    case "sport-football":
      return DEMO_GROUP_STANDINGS;
    case "sport-basketball":
      return DEMO_BASKETBALL_GROUP_STANDINGS;
    case "sport-volleyball":
      return DEMO_VOLLEYBALL_GROUP_STANDINGS;
    default:
      return [];
  }
}

export function getGroups(): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const row of DEMO_GROUP_STANDINGS) {
    seen.set(row.group_id, row.group_name);
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

export function getBracketByRound(round?: string): BracketFixture[] {
  if (!round) return DEMO_BRACKET_FIXTURES;
  return DEMO_BRACKET_FIXTURES.filter((f) => f.round === round);
}

export function getBracketFixturesForSport(sportDbId: string): BracketFixture[] {
  switch (sportDbId) {
    case "sport-football":
      return DEMO_BRACKET_FIXTURES;
    case "sport-tennis":
      return DEMO_TENNIS_BRACKET_FIXTURES;
    case "sport-basketball":
      return DEMO_BASKETBALL_BRACKET_FIXTURES;
    case "sport-volleyball":
      return DEMO_VOLLEYBALL_BRACKET_FIXTURES;
    default:
      return [];
  }
}

export function getMeetEventsForSport(sportDbId: string): MeetEventFixture[] {
  if (sportDbId === "sport-track") return DEMO_TRACK_MEET_EVENTS;
  return [];
}

/** Fill in the holder's crest from the sport's team logo when not set */
function withHolderLogo(t: Tournament): Tournament {
  if (!t.title_holder || t.title_holder.logo_url || !t.title_holder.team_id) return t;
  return {
    ...t,
    title_holder: { ...t.title_holder, logo_url: logoForSportId(t.sport_id) },
  };
}

/** All competitions per sport — leagues first, then cups. */
export function getTournamentsForSport(sportDbId: string): Tournament[] {
  const list = (() => {
    switch (sportDbId) {
      case "sport-football":
        return [DEMO_LEAGUE_TOURNAMENT, DEMO_CUP_TOURNAMENT, DEMO_DEANS_CUP_TOURNAMENT];
      case "sport-basketball":
        return [DEMO_BASKETBALL_LEAGUE_TOURNAMENT, DEMO_BASKETBALL_TOURNAMENT];
      case "sport-volleyball":
        return [DEMO_VOLLEYBALL_LEAGUE_TOURNAMENT, DEMO_VOLLEYBALL_TOURNAMENT];
      case "sport-tennis":
        return [DEMO_TENNIS_TOURNAMENT, DEMO_TENNIS_DOUBLES_TOURNAMENT];
      case "sport-track":
        return [DEMO_TRACK_TOURNAMENT, DEMO_TRACK_GP_TOURNAMENT];
      default:
        return [];
    }
  })();
  // Plus competitions created on the spot from the admin wizard (demo overlay).
  return [...list, ...listCreatedDemoTournaments(sportDbId)].map(withHolderLogo);
}

export function getTournamentForSport(sportDbId: string, tournamentId?: string): Tournament | null {
  const all = getTournamentsForSport(sportDbId);
  if (tournamentId) {
    const found = all.find((t) => t.id === tournamentId);
    if (found) return found;
  }
  return all[0] ?? null;
}

/** Bracket fixtures belong to a specific competition, not the sport. */
export function getBracketFixturesForTournament(tournamentId: string): BracketFixture[] {
  switch (tournamentId) {
    case "tourn-cup-2026":
      return DEMO_BRACKET_FIXTURES;
    case "tourn-deans-cup-2026":
      return DEMO_DEANS_CUP_FIXTURES;
    case "tourn-tennis-2026":
      return DEMO_TENNIS_BRACKET_FIXTURES;
    case "tourn-bball-cup-2026":
      return DEMO_BASKETBALL_BRACKET_FIXTURES;
    case "tourn-volley-cup-2026":
      return DEMO_VOLLEYBALL_BRACKET_FIXTURES;
    default:
      return [];
  }
}

export function getGroupStandingsForTournament(tournamentId: string): GroupStandingRow[] {
  switch (tournamentId) {
    case "tourn-cup-2026":
      return DEMO_GROUP_STANDINGS;
    case "tourn-bball-cup-2026":
      return DEMO_BASKETBALL_GROUP_STANDINGS;
    case "tourn-volley-cup-2026":
      return DEMO_VOLLEYBALL_GROUP_STANDINGS;
    default:
      return [];
  }
}

export function getMeetEventsForTournament(tournamentId: string): MeetEventFixture[] {
  if (tournamentId === "tourn-track-2026") return DEMO_TRACK_MEET_EVENTS;
  return [];
}

/**
 * Teams registered for a competition. Returns null when registration is open
 * to every club of the sport (leagues in demo). Live mode reads the
 * tournament_teams table instead.
 */
export function getRegisteredTeamIdsForTournament(tournamentId: string): string[] | null {
  const fixtures = getBracketFixturesForTournament(tournamentId);
  if (fixtures.length === 0) return null;
  const ids = new Set<string>();
  for (const f of fixtures) {
    if (f.home_team_id) ids.add(f.home_team_id);
    if (f.away_team_id) ids.add(f.away_team_id);
  }
  return ids.size > 0 ? Array.from(ids) : null;
}

export function formatTournamentRules(rules: Tournament["rules"], sportDbId?: string): string[] {
  const labels: string[] = [];
  if (rules.extra_time) labels.push("Extra time if drawn");
  if (rules.penalties_after_full_time) labels.push("Penalties after full time");
  else if (rules.penalty_shootout) labels.push("Penalties after extra time (5 each, sudden death)");
  if (rules.overtime) labels.push("Overtime periods if tied");
  if (sportDbId === "sport-volleyball") labels.push("Best of 5 sets (25 pts, win by 2)");
  if (sportDbId === "sport-tennis") labels.push("Best of 3 sets (tiebreak at 6–6)");
  if (sportDbId === "sport-track") labels.push("Electronic timing · Wind-legal finals");
  return labels;
}

/** @deprecated Use formatTournamentRules */
export function formatFootballRules(rules: Tournament["rules"]): string[] {
  return formatTournamentRules(rules);
}
