import type {
  Department,
  Match,
  Player,
  Sport,
  StandingRow,
  Team,
  Tournament,
} from "@/lib/types/database";
import {
  DEMO_BASKETBALL_LEAGUE_TOURNAMENT,
  DEMO_CUP_TOURNAMENT,
  DEMO_LEAGUE_TOURNAMENT,
  DEMO_TENNIS_TOURNAMENT,
  DEMO_TRACK_TOURNAMENT,
  DEMO_VOLLEYBALL_LEAGUE_TOURNAMENT,
} from "@/lib/data/demo-competition";
import { logoForSportId, playerAvatarForId } from "@/lib/utils/sport-assets";

function teamLogo(sportId: string) {
  return logoForSportId(sportId);
}

function playerAvatar(playerId: string) {
  return playerAvatarForId(playerId);
}

export const DEMO_DEPARTMENTS: Department[] = [
  { id: "dept-csc", name: "Computer Science", short_code: "CSC", created_at: "" },
  { id: "dept-mec", name: "Mechanical Engineering", short_code: "MEC", created_at: "" },
  { id: "dept-eee", name: "Electrical Engineering", short_code: "EEE", created_at: "" },
  { id: "dept-bio", name: "Biological Sciences", short_code: "BIO", created_at: "" },
  { id: "dept-law", name: "Law", short_code: "LAW", created_at: "" },
  { id: "dept-med", name: "Medicine", short_code: "MED", created_at: "" },
];

export const DEMO_SPORTS: Sport[] = [
  { id: "sport-football", name: "Football", type: "team", score_type: "points" },
  { id: "sport-basketball", name: "Basketball", type: "team", score_type: "points" },
  { id: "sport-tennis", name: "Lawn Tennis", type: "individual", score_type: "sets" },
  { id: "sport-track", name: "Track & Field", type: "individual", score_type: "time" },
  { id: "sport-volleyball", name: "Volleyball", type: "team", score_type: "sets" },
];

export const DEMO_TEAMS: Team[] = [
  { id: "team-csc-fc", department_id: "dept-csc", sport_id: "sport-football", name: "CSC FC", logo_url: teamLogo("sport-football") },
  { id: "team-mec-giants", department_id: "dept-mec", sport_id: "sport-football", name: "MEC Giants", logo_url: teamLogo("sport-football") },
  { id: "team-eee-strikers", department_id: "dept-eee", sport_id: "sport-football", name: "EEE Strikers", logo_url: teamLogo("sport-football") },
  { id: "team-bio-wolves", department_id: "dept-bio", sport_id: "sport-football", name: "Bio Wolves", logo_url: teamLogo("sport-football") },
  { id: "team-law-barristers", department_id: "dept-law", sport_id: "sport-football", name: "Law Barristers", logo_url: teamLogo("sport-football") },
  { id: "team-csc-hoops", department_id: "dept-csc", sport_id: "sport-basketball", name: "CSC Hoops", logo_url: teamLogo("sport-basketball") },
  { id: "team-med-court", department_id: "dept-med", sport_id: "sport-basketball", name: "Med Court Kings", logo_url: teamLogo("sport-basketball") },
  { id: "team-mec-hoops", department_id: "dept-mec", sport_id: "sport-basketball", name: "MEC Ballers", logo_url: teamLogo("sport-basketball") },
  { id: "team-eee-hoops", department_id: "dept-eee", sport_id: "sport-basketball", name: "EEE Shooters", logo_url: teamLogo("sport-basketball") },
  { id: "team-csc-tennis", department_id: "dept-csc", sport_id: "sport-tennis", name: "CSC Tennis", logo_url: teamLogo("sport-tennis") },
  { id: "team-mec-tennis", department_id: "dept-mec", sport_id: "sport-tennis", name: "MEC Rackets", logo_url: teamLogo("sport-tennis") },
  { id: "team-eee-tennis", department_id: "dept-eee", sport_id: "sport-tennis", name: "EEE Aces", logo_url: teamLogo("sport-tennis") },
  { id: "team-bio-tennis", department_id: "dept-bio", sport_id: "sport-tennis", name: "Bio Racquets", logo_url: teamLogo("sport-tennis") },
  { id: "team-csc-volley", department_id: "dept-csc", sport_id: "sport-volleyball", name: "CSC Spikers", logo_url: teamLogo("sport-volleyball") },
  { id: "team-mec-volley", department_id: "dept-mec", sport_id: "sport-volleyball", name: "MEC Volleys", logo_url: teamLogo("sport-volleyball") },
  { id: "team-eee-volley", department_id: "dept-eee", sport_id: "sport-volleyball", name: "EEE Netters", logo_url: teamLogo("sport-volleyball") },
  { id: "team-bio-volley", department_id: "dept-bio", sport_id: "sport-volleyball", name: "Bio Blockers", logo_url: teamLogo("sport-volleyball") },
  { id: "team-law-volley", department_id: "dept-law", sport_id: "sport-volleyball", name: "Law Servers", logo_url: teamLogo("sport-volleyball") },
];

export const DEMO_TOURNAMENT: Tournament = DEMO_LEAGUE_TOURNAMENT;

export const DEMO_PLAYERS: Player[] = [
  { id: "pl-1", department_id: "dept-csc", first_name: "Adaeze", last_name: "Okonkwo", matric_number: "AU/CS/2022/0142", avatar_url: playerAvatar("pl-1"), position: "Forward" },
  { id: "pl-2", department_id: "dept-csc", first_name: "Chidi", last_name: "Eze", matric_number: "AU/CS/2021/0089", avatar_url: playerAvatar("pl-2"), position: "Midfielder" },
  { id: "pl-3", department_id: "dept-csc", first_name: "Ngozi", last_name: "Adeyemi", matric_number: "AU/CS/2023/0201", avatar_url: playerAvatar("pl-3"), position: "Goalkeeper" },
  { id: "pl-4", department_id: "dept-mec", first_name: "Tunde", last_name: "Bakare", matric_number: "AU/ME/2022/0067", avatar_url: playerAvatar("pl-4"), position: "Forward" },
  { id: "pl-5", department_id: "dept-mec", first_name: "Fatima", last_name: "Ibrahim", matric_number: "AU/ME/2021/0034", avatar_url: playerAvatar("pl-5"), position: "Defender" },
  { id: "pl-6", department_id: "dept-eee", first_name: "Emeka", last_name: "Nwosu", matric_number: "AU/EE/2022/0118", avatar_url: playerAvatar("pl-6"), position: "Midfielder" },
  { id: "pl-7", department_id: "dept-bio", first_name: "Amina", last_name: "Bello", matric_number: "AU/BS/2023/0156", avatar_url: playerAvatar("pl-7"), position: "Forward" },
  { id: "pl-8", department_id: "dept-law", first_name: "Kelechi", last_name: "Okafor", matric_number: "AU/LW/2022/0078", avatar_url: playerAvatar("pl-8"), position: "Defender" },
  { id: "pl-9", department_id: "dept-med", first_name: "David", last_name: "Osei", matric_number: "AU/MD/2022/0091", avatar_url: playerAvatar("pl-9"), position: "Guard" },
  { id: "pl-10", department_id: "dept-csc", first_name: "Zainab", last_name: "Yusuf", matric_number: "AU/CS/2022/0178", avatar_url: playerAvatar("pl-10"), position: "Singles" },
  { id: "pl-11", department_id: "dept-mec", first_name: "James", last_name: "Adebola", matric_number: "AU/ME/2023/0045", avatar_url: playerAvatar("pl-11"), position: "Sprinter" },
  { id: "pl-12", department_id: "dept-bio", first_name: "Grace", last_name: "Etim", matric_number: "AU/BS/2022/0133", avatar_url: playerAvatar("pl-12"), position: "Sprinter" },
  { id: "pl-13", department_id: "dept-csc", first_name: "Chinwe", last_name: "Okafor", matric_number: "AU/CS/2022/0192", avatar_url: playerAvatar("pl-13"), position: "Setter" },
  { id: "pl-14", department_id: "dept-mec", first_name: "Ibrahim", last_name: "Musa", matric_number: "AU/ME/2023/0088", avatar_url: playerAvatar("pl-14"), position: "Outside Hitter" },
  { id: "pl-15", department_id: "dept-eee", first_name: "Blessing", last_name: "Udoh", matric_number: "AU/EE/2022/0144", avatar_url: playerAvatar("pl-15"), position: "Middle Blocker" },
  { id: "pl-16", department_id: "dept-csc", first_name: "Michael", last_name: "Okoro", matric_number: "AU/CS/2023/0210", avatar_url: playerAvatar("pl-16"), position: "Defender" },
  { id: "pl-17", department_id: "dept-csc", first_name: "Funke", last_name: "Adebayo", matric_number: "AU/CS/2022/0165", avatar_url: playerAvatar("pl-17"), position: "Midfielder" },
  { id: "pl-18", department_id: "dept-law", first_name: "Nneka", last_name: "Okafor", matric_number: "AU/LW/2023/0092", avatar_url: playerAvatar("pl-18"), position: "Singles" },
  { id: "pl-19", department_id: "dept-mec", first_name: "Yusuf", last_name: "Abdullahi", matric_number: "AU/ME/2022/0095", avatar_url: playerAvatar("pl-19"), position: "Singles" },
  { id: "pl-20", department_id: "dept-eee", first_name: "Samuel", last_name: "Adeyemi", matric_number: "AU/EE/2023/0120", avatar_url: playerAvatar("pl-20"), position: "Singles" },
  { id: "pl-30", department_id: "dept-csc", first_name: "Daniel", last_name: "Uche", matric_number: "AU/CS/2022/0188", avatar_url: playerAvatar("pl-30"), position: "Defender" },
  { id: "pl-31", department_id: "dept-csc", first_name: "Peace", last_name: "Nwankwo", matric_number: "AU/CS/2021/0075", avatar_url: playerAvatar("pl-31"), position: "Forward" },
  { id: "pl-32", department_id: "dept-mec", first_name: "Hassan", last_name: "Garba", matric_number: "AU/ME/2022/0112", avatar_url: playerAvatar("pl-32"), position: "Defender" },
  { id: "pl-33", department_id: "dept-mec", first_name: "Rita", last_name: "Chukwu", matric_number: "AU/ME/2023/0066", avatar_url: playerAvatar("pl-33"), position: "Midfielder" },
  { id: "pl-34", department_id: "dept-eee", first_name: "Peter", last_name: "Obi", matric_number: "AU/EE/2022/0105", avatar_url: playerAvatar("pl-34"), position: "Forward" },
  { id: "pl-35", department_id: "dept-bio", first_name: "Mary", last_name: "Okon", matric_number: "AU/BS/2023/0148", avatar_url: playerAvatar("pl-35"), position: "Defender" },
];

function team(id: string): Team {
  const t = DEMO_TEAMS.find((x) => x.id === id)!;
  const dept = DEMO_DEPARTMENTS.find((d) => d.id === t.department_id);
  return { ...t, department: dept };
}

const RAW_DEMO_MATCHES: Match[] = [
  {
    id: "match-1",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-football",
    home_team_id: "team-csc-fc",
    away_team_id: "team-mec-giants",
    status: "live",
    current_period: "half_1",
    home_score: 2,
    away_score: 1,
    scheduled_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    ended_at: null,
    win_probability: {
      algo: { home: 52, draw: 22, away: 26 },
      votes: { home: 68, draw: 12, away: 20 },
    },
    home_team: team("team-csc-fc"),
    away_team: team("team-mec-giants"),
    tournament: DEMO_TOURNAMENT,
    sport: DEMO_SPORTS[0],
  },
  {
    id: "match-2",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-football",
    home_team_id: "team-eee-strikers",
    away_team_id: "team-bio-wolves",
    status: "scheduled",
    current_period: "not_started",
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    started_at: null,
    ended_at: null,
    win_probability: {
      algo: { home: 41, draw: 25, away: 34 },
      votes: { home: 55, draw: 18, away: 27 },
    },
    home_team: team("team-eee-strikers"),
    away_team: team("team-bio-wolves"),
    tournament: DEMO_TOURNAMENT,
    sport: DEMO_SPORTS[0],
  },
  {
    id: "match-3",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-football",
    home_team_id: "team-law-barristers",
    away_team_id: "team-csc-fc",
    status: "completed",
    current_period: "full_time",
    home_score: 0,
    away_score: 3,
    scheduled_at: new Date(Date.now() - 172800000).toISOString(),
    started_at: new Date(Date.now() - 172800000).toISOString(),
    ended_at: new Date(Date.now() - 169200000).toISOString(),
    win_probability: { algo: { home: 22, draw: 18, away: 60 }, votes: { home: 13, draw: 9, away: 78 } },
    home_team: team("team-law-barristers"),
    away_team: team("team-csc-fc"),
    tournament: DEMO_TOURNAMENT,
    sport: DEMO_SPORTS[0],
  },
  {
    id: "match-4",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-basketball",
    home_team_id: "team-csc-hoops",
    away_team_id: "team-med-court",
    status: "live",
    current_period: "quarter_3",
    home_score: 58,
    away_score: 61,
    scheduled_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    ended_at: null,
    win_probability: {
      algo: { home: 48, draw: 0, away: 52 },
      votes: { home: 44, draw: 0, away: 56 },
    },
    home_team: team("team-csc-hoops"),
    away_team: team("team-med-court"),
    tournament: DEMO_BASKETBALL_LEAGUE_TOURNAMENT,
    sport: DEMO_SPORTS[1],
  },
  {
    id: "match-5",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-basketball",
    home_team_id: "team-mec-hoops",
    away_team_id: "team-eee-hoops",
    status: "scheduled",
    current_period: "not_started",
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: null,
    ended_at: null,
    win_probability: { algo: { home: 55, draw: 0, away: 45 }, votes: { home: 62, draw: 0, away: 38 } },
    home_team: team("team-mec-hoops"),
    away_team: team("team-eee-hoops"),
    tournament: DEMO_BASKETBALL_LEAGUE_TOURNAMENT,
    sport: DEMO_SPORTS[1],
  },
  {
    id: "match-6",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-basketball",
    home_team_id: "team-csc-hoops",
    away_team_id: "team-mec-hoops",
    status: "completed",
    current_period: "full_time",
    home_score: 72,
    away_score: 68,
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    started_at: new Date(Date.now() - 86400000).toISOString(),
    ended_at: new Date(Date.now() - 82800000).toISOString(),
    win_probability: null,
    home_team: team("team-csc-hoops"),
    away_team: team("team-mec-hoops"),
    tournament: DEMO_BASKETBALL_LEAGUE_TOURNAMENT,
    sport: DEMO_SPORTS[1],
  },
  {
    id: "match-7",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-tennis",
    home_team_id: "team-csc-tennis",
    away_team_id: "team-mec-tennis",
    status: "live",
    current_period: "set_2",
    home_score: 1,
    away_score: 0,
    scheduled_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    ended_at: null,
    win_probability: { algo: { home: 58, draw: 0, away: 42 }, votes: { home: 71, draw: 0, away: 29 } },
    match_variant: "singles",
    competition_format: "individual",
    home_team: team("team-csc-tennis"),
    away_team: team("team-mec-tennis"),
    tournament: DEMO_TENNIS_TOURNAMENT,
    sport: DEMO_SPORTS[2],
  },
  {
    id: "match-8",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-tennis",
    home_team_id: "team-eee-tennis",
    away_team_id: "team-bio-tennis",
    status: "scheduled",
    current_period: "not_started",
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date(Date.now() + 172800000).toISOString(),
    started_at: null,
    ended_at: null,
    win_probability: { algo: { home: 47, draw: 0, away: 53 }, votes: { home: 49, draw: 0, away: 51 } },
    match_variant: "singles",
    competition_format: "individual",
    home_team: team("team-eee-tennis"),
    away_team: team("team-bio-tennis"),
    tournament: DEMO_TENNIS_TOURNAMENT,
    sport: DEMO_SPORTS[2],
  },
  {
    id: "match-9",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-tennis",
    home_team_id: "team-csc-tennis",
    away_team_id: "team-eee-tennis",
    status: "completed",
    current_period: "full_time",
    home_score: 2,
    away_score: 1,
    scheduled_at: new Date(Date.now() - 259200000).toISOString(),
    started_at: new Date(Date.now() - 259200000).toISOString(),
    ended_at: new Date(Date.now() - 255600000).toISOString(),
    win_probability: null,
    home_team: team("team-csc-tennis"),
    away_team: team("team-eee-tennis"),
    tournament: DEMO_TENNIS_TOURNAMENT,
    sport: DEMO_SPORTS[2],
  },
  {
    id: "match-10",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-track",
    home_team_id: null,
    away_team_id: null,
    status: "live",
    current_period: "final",
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    ended_at: null,
    win_probability: null,
    home_team: { id: "evt-100m", department_id: "dept-csc", sport_id: "sport-track", name: "100m Men Final", logo_url: teamLogo("sport-track"), department: DEMO_DEPARTMENTS[0] },
    away_team: undefined,
    tournament: DEMO_TRACK_TOURNAMENT,
    sport: DEMO_SPORTS[3],
  },
  {
    id: "match-11",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-track",
    home_team_id: null,
    away_team_id: null,
    status: "scheduled",
    current_period: "not_started",
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: null,
    ended_at: null,
    win_probability: null,
    home_team: { id: "evt-400m", department_id: "dept-mec", sport_id: "sport-track", name: "400m Women Final", logo_url: teamLogo("sport-track"), department: DEMO_DEPARTMENTS[1] },
    away_team: undefined,
    tournament: DEMO_TRACK_TOURNAMENT,
    sport: DEMO_SPORTS[3],
  },
  {
    id: "match-12",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-volleyball",
    home_team_id: "team-csc-volley",
    away_team_id: "team-mec-volley",
    status: "live",
    current_period: "set_4",
    home_score: 2,
    away_score: 1,
    scheduled_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    ended_at: null,
    win_probability: { algo: { home: 62, draw: 0, away: 38 }, votes: { home: 74, draw: 0, away: 26 } },
    home_team: team("team-csc-volley"),
    away_team: team("team-mec-volley"),
    tournament: DEMO_VOLLEYBALL_LEAGUE_TOURNAMENT,
    sport: DEMO_SPORTS[4],
  },
  {
    id: "match-13",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-volleyball",
    home_team_id: "team-eee-volley",
    away_team_id: "team-bio-volley",
    status: "scheduled",
    current_period: "not_started",
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: null,
    ended_at: null,
    win_probability: { algo: { home: 51, draw: 0, away: 49 }, votes: { home: 58, draw: 0, away: 42 } },
    home_team: team("team-eee-volley"),
    away_team: team("team-bio-volley"),
    tournament: DEMO_VOLLEYBALL_LEAGUE_TOURNAMENT,
    sport: DEMO_SPORTS[4],
  },
  {
    id: "match-14",
    tournament_id: "tourn-ifl-2026",
    sport_id: "sport-volleyball",
    home_team_id: "team-csc-volley",
    away_team_id: "team-law-volley",
    status: "completed",
    current_period: "full_time",
    home_score: 3,
    away_score: 1,
    scheduled_at: new Date(Date.now() - 172800000).toISOString(),
    started_at: new Date(Date.now() - 172800000).toISOString(),
    ended_at: new Date(Date.now() - 169200000).toISOString(),
    win_probability: null,
    home_team: team("team-csc-volley"),
    away_team: team("team-law-volley"),
    tournament: DEMO_VOLLEYBALL_LEAGUE_TOURNAMENT,
    sport: DEMO_SPORTS[4],
  },
  {
    id: "match-15",
    tournament_id: "tourn-cup-2026",
    sport_id: "sport-football",
    home_team_id: "team-csc-fc",
    away_team_id: "team-mec-giants",
    status: "completed",
    current_period: "penalty_shootout",
    home_score: 2,
    away_score: 2,
    home_penalties: 4,
    away_penalties: 3,
    went_to_extra_time: true,
    competition_phase: "quarter_final",
    match_variant: "standard",
    scheduled_at: new Date(Date.now() - 432000000).toISOString(),
    started_at: new Date(Date.now() - 432000000).toISOString(),
    ended_at: new Date(Date.now() - 428400000).toISOString(),
    win_probability: { algo: { home: 48, draw: 22, away: 30 }, votes: { home: 52, draw: 14, away: 34 } },
    home_team: team("team-csc-fc"),
    away_team: team("team-mec-giants"),
    tournament: DEMO_CUP_TOURNAMENT,
    sport: DEMO_SPORTS[0],
  },
  {
    id: "match-16",
    tournament_id: "tourn-tennis-2026",
    sport_id: "sport-tennis",
    home_team_id: "team-csc-tennis",
    away_team_id: "team-mec-tennis",
    status: "completed",
    current_period: "full_time",
    home_score: 2,
    away_score: 0,
    match_variant: "doubles",
    competition_phase: "quarter_final",
    competition_format: "individual",
    scheduled_at: new Date(Date.now() - 259200000).toISOString(),
    started_at: new Date(Date.now() - 259200000).toISOString(),
    ended_at: new Date(Date.now() - 255600000).toISOString(),
    win_probability: null,
    home_team: team("team-csc-tennis"),
    away_team: team("team-mec-tennis"),
    tournament: DEMO_TENNIS_TOURNAMENT,
    sport: DEMO_SPORTS[2],
  },
];

/** tournament_id always mirrors the attached tournament — keeps per-competition filtering correct. */
export const DEMO_MATCHES: Match[] = RAW_DEMO_MATCHES.map((m) =>
  m.tournament ? { ...m, tournament_id: m.tournament.id } : m
);

export const DEMO_STANDINGS_FOOTBALL: StandingRow[] = [
  { team_id: "team-csc-fc", team_name: "CSC FC", short_code: "CSC", played: 8, won: 6, drawn: 1, lost: 1, goals_for: 18, goals_against: 7, goal_difference: 11, points: 19, form: ["W", "W", "D", "W", "L"] },
  { team_id: "team-mec-giants", team_name: "MEC Giants", short_code: "MEC", played: 8, won: 5, drawn: 2, lost: 1, goals_for: 14, goals_against: 8, goal_difference: 6, points: 17, form: ["W", "D", "W", "W", "D"] },
  { team_id: "team-eee-strikers", team_name: "EEE Strikers", short_code: "EEE", played: 8, won: 4, drawn: 2, lost: 2, goals_for: 12, goals_against: 10, goal_difference: 2, points: 14, form: ["L", "W", "W", "D", "W"] },
  { team_id: "team-bio-wolves", team_name: "Bio Wolves", short_code: "BIO", played: 8, won: 3, drawn: 1, lost: 4, goals_for: 9, goals_against: 12, goal_difference: -3, points: 10, form: ["W", "L", "L", "W", "L"] },
  { team_id: "team-law-barristers", team_name: "Law Barristers", short_code: "LAW", played: 8, won: 1, drawn: 2, lost: 5, goals_for: 5, goals_against: 16, goal_difference: -11, points: 5, form: ["L", "D", "L", "L", "D"] },
];

export const DEMO_STANDINGS = DEMO_STANDINGS_FOOTBALL;

export const DEMO_STANDINGS_BASKETBALL: StandingRow[] = [
  { team_id: "team-med-court", team_name: "Med Court Kings", short_code: "MED", played: 10, won: 8, drawn: 0, lost: 2, goals_for: 820, goals_against: 760, goal_difference: 60, points: 16, form: ["W", "W", "L", "W", "W"] },
  { team_id: "team-csc-hoops", team_name: "CSC Hoops", short_code: "CSC", played: 10, won: 7, drawn: 0, lost: 3, goals_for: 790, goals_against: 755, goal_difference: 35, points: 14, form: ["W", "L", "W", "W", "W"] },
  { team_id: "team-mec-hoops", team_name: "MEC Ballers", short_code: "MEC", played: 10, won: 6, drawn: 0, lost: 4, goals_for: 775, goals_against: 770, goal_difference: 5, points: 12, form: ["L", "W", "W", "L", "W"] },
  { team_id: "team-eee-hoops", team_name: "EEE Shooters", short_code: "EEE", played: 10, won: 3, drawn: 0, lost: 7, goals_for: 710, goals_against: 810, goal_difference: -100, points: 6, form: ["L", "L", "W", "L", "L"] },
];

export const DEMO_STANDINGS_TENNIS: StandingRow[] = [
  { team_id: "team-csc-tennis", team_name: "CSC Tennis", short_code: "CSC", played: 6, won: 5, drawn: 0, lost: 1, goals_for: 10, goals_against: 4, goal_difference: 6, points: 15, form: ["W", "W", "W", "L", "W"] },
  { team_id: "team-mec-tennis", team_name: "MEC Rackets", short_code: "MEC", played: 6, won: 4, drawn: 0, lost: 2, goals_for: 8, goals_against: 6, goal_difference: 2, points: 12, form: ["W", "L", "W", "W", "L"] },
  { team_id: "team-eee-tennis", team_name: "EEE Aces", short_code: "EEE", played: 6, won: 3, drawn: 0, lost: 3, goals_for: 7, goals_against: 7, goal_difference: 0, points: 9, form: ["L", "W", "L", "W", "W"] },
  { team_id: "team-bio-tennis", team_name: "Bio Racquets", short_code: "BIO", played: 6, won: 0, drawn: 0, lost: 6, goals_for: 2, goals_against: 12, goal_difference: -10, points: 0, form: ["L", "L", "L", "L", "L"] },
];

export const DEMO_STANDINGS_TRACK: StandingRow[] = [
  { team_id: "pl-11", team_name: "James Adebola", short_code: "MEC", played: 4, won: 3, drawn: 1, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 30, form: ["W", "W", "L", "W"] },
  { team_id: "pl-12", team_name: "Grace Etim", short_code: "BIO", played: 4, won: 3, drawn: 0, lost: 1, goals_for: 0, goals_against: 0, goal_difference: 0, points: 28, form: ["W", "W", "W", "L"] },
  { team_id: "pl-1", team_name: "Adaeze Okonkwo", short_code: "CSC", played: 3, won: 2, drawn: 1, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 22, form: ["W", "L", "W"] },
  { team_id: "pl-4", team_name: "Tunde Bakare", short_code: "MEC", played: 3, won: 1, drawn: 0, lost: 2, goals_for: 0, goals_against: 0, goal_difference: 0, points: 15, form: ["L", "W", "L"] },
];

export const DEMO_STANDINGS_VOLLEYBALL: StandingRow[] = [
  { team_id: "team-csc-volley", team_name: "CSC Spikers", short_code: "CSC", played: 8, won: 7, drawn: 0, lost: 1, goals_for: 21, goals_against: 8, goal_difference: 13, points: 21, form: ["W", "W", "W", "L", "W"] },
  { team_id: "team-mec-volley", team_name: "MEC Volleys", short_code: "MEC", played: 8, won: 5, drawn: 0, lost: 3, goals_for: 17, goals_against: 14, goal_difference: 3, points: 15, form: ["W", "L", "W", "W", "L"] },
  { team_id: "team-eee-volley", team_name: "EEE Netters", short_code: "EEE", played: 8, won: 4, drawn: 0, lost: 4, goals_for: 14, goals_against: 16, goal_difference: -2, points: 12, form: ["L", "W", "L", "W", "W"] },
  { team_id: "team-bio-volley", team_name: "Bio Blockers", short_code: "BIO", played: 8, won: 2, drawn: 0, lost: 6, goals_for: 10, goals_against: 19, goal_difference: -9, points: 6, form: ["L", "L", "W", "L", "L"] },
  { team_id: "team-law-volley", team_name: "Law Servers", short_code: "LAW", played: 8, won: 2, drawn: 0, lost: 6, goals_for: 9, goals_against: 20, goal_difference: -11, points: 6, form: ["L", "W", "L", "L", "L"] },
];

/** @deprecated Use getEventsForMatch from demo-match-details */
export const DEMO_EVENTS = [
  { id: "ev-1", match_id: "match-1", player: DEMO_PLAYERS[0], event_type: "goal", match_time: "12'", period: "half_1", details: { assist_player_id: "pl-2" } },
  { id: "ev-2", match_id: "match-1", player: DEMO_PLAYERS[3], event_type: "goal", match_time: "28'", period: "half_1", details: null },
  { id: "ev-3", match_id: "match-1", player: DEMO_PLAYERS[0], event_type: "goal", match_time: "36'", period: "half_1", details: null },
  { id: "ev-4", match_id: "match-1", player: DEMO_PLAYERS[4], event_type: "yellow_card", match_time: "38'", period: "half_1", details: null },
];

function playerTeam(playerId: string, sportId = "sport-football") {
  const player = DEMO_PLAYERS.find((p) => p.id === playerId)!;
  const t = DEMO_TEAMS.find((x) => x.department_id === player.department_id && x.sport_id === sportId);
  const dept = DEMO_DEPARTMENTS.find((d) => d.id === player.department_id);
  return {
    player,
    teamName: t?.name ?? dept?.name ?? "",
    teamCode: dept?.short_code ?? "",
  };
}

export const DEMO_STAT_LEADERS_FOOTBALL = {
  goals: [
    { ...playerTeam("pl-1"), value: 6 },
    { ...playerTeam("pl-4"), value: 4 },
    { ...playerTeam("pl-7"), value: 3 },
    { ...playerTeam("pl-6"), value: 2 },
  ],
  assists: [
    { ...playerTeam("pl-2"), value: 4 },
    { ...playerTeam("pl-6"), value: 3 },
    { ...playerTeam("pl-1"), value: 2 },
    { ...playerTeam("pl-4"), value: 1 },
  ],
  cleanSheets: [
    { ...playerTeam("pl-3"), value: 3 },
    { ...playerTeam("pl-5"), value: 2 },
    { ...playerTeam("pl-8"), value: 1 },
    { ...playerTeam("pl-2"), value: 0 },
  ],
  passes: [
    { ...playerTeam("pl-2"), value: 142 },
    { ...playerTeam("pl-6"), value: 128 },
    { ...playerTeam("pl-5"), value: 115 },
    { ...playerTeam("pl-1"), value: 98 },
  ],
};

export const DEMO_STAT_LEADERS = DEMO_STAT_LEADERS_FOOTBALL;

export const DEMO_STAT_LEADERS_BASKETBALL = {
  goals: [
    { ...playerTeam("pl-9", "sport-basketball"), value: 284 },
    { ...playerTeam("pl-1", "sport-basketball"), value: 241 },
    { ...playerTeam("pl-4", "sport-basketball"), value: 218 },
    { ...playerTeam("pl-6", "sport-basketball"), value: 195 },
  ],
  assists: [
    { ...playerTeam("pl-2", "sport-basketball"), value: 89 },
    { ...playerTeam("pl-9", "sport-basketball"), value: 72 },
    { ...playerTeam("pl-6", "sport-basketball"), value: 65 },
    { ...playerTeam("pl-1", "sport-basketball"), value: 58 },
  ],
  passes: [
    { ...playerTeam("pl-9", "sport-basketball"), value: 48 },
    { ...playerTeam("pl-1", "sport-basketball"), value: 41 },
    { ...playerTeam("pl-4", "sport-basketball"), value: 36 },
    { ...playerTeam("pl-2", "sport-basketball"), value: 29 },
  ],
  cleanSheets: [
    { ...playerTeam("pl-9", "sport-basketball"), value: 112 },
    { ...playerTeam("pl-4", "sport-basketball"), value: 98 },
    { ...playerTeam("pl-1", "sport-basketball"), value: 87 },
    { ...playerTeam("pl-6", "sport-basketball"), value: 76 },
  ],
};

export const DEMO_STAT_LEADERS_TENNIS = {
  goals: [
    { ...playerTeam("pl-10", "sport-tennis"), value: 8 },
    { ...playerTeam("pl-1", "sport-tennis"), value: 6 },
    { ...playerTeam("pl-4", "sport-tennis"), value: 5 },
    { ...playerTeam("pl-7", "sport-tennis"), value: 4 },
  ],
  assists: [
    { ...playerTeam("pl-10", "sport-tennis"), value: 18 },
    { ...playerTeam("pl-1", "sport-tennis"), value: 14 },
    { ...playerTeam("pl-4", "sport-tennis"), value: 11 },
    { ...playerTeam("pl-6", "sport-tennis"), value: 9 },
  ],
  passes: [
    { ...playerTeam("pl-10", "sport-tennis"), value: 42 },
    { ...playerTeam("pl-1", "sport-tennis"), value: 38 },
    { ...playerTeam("pl-4", "sport-tennis"), value: 31 },
    { ...playerTeam("pl-7", "sport-tennis"), value: 27 },
  ],
  cleanSheets: [
    { ...playerTeam("pl-10", "sport-tennis"), value: 24 },
    { ...playerTeam("pl-1", "sport-tennis"), value: 19 },
    { ...playerTeam("pl-4", "sport-tennis"), value: 15 },
    { ...playerTeam("pl-6", "sport-tennis"), value: 12 },
  ],
};

export const DEMO_STAT_LEADERS_TRACK = {
  goals: [
    { ...playerTeam("pl-11", "sport-track"), value: 10.58 },
    { ...playerTeam("pl-12", "sport-track"), value: 10.72 },
    { ...playerTeam("pl-1", "sport-track"), value: 10.89 },
    { ...playerTeam("pl-4", "sport-track"), value: 11.05 },
  ],
  assists: [
    { ...playerTeam("pl-12", "sport-track"), value: 23.14 },
    { ...playerTeam("pl-11", "sport-track"), value: 23.45 },
    { ...playerTeam("pl-1", "sport-track"), value: 24.01 },
    { ...playerTeam("pl-4", "sport-track"), value: 24.88 },
  ],
  passes: [
    { ...playerTeam("pl-11", "sport-track"), value: 52.3 },
    { ...playerTeam("pl-12", "sport-track"), value: 53.1 },
    { ...playerTeam("pl-1", "sport-track"), value: 54.8 },
    { ...playerTeam("pl-4", "sport-track"), value: 55.2 },
  ],
  cleanSheets: [
    { ...playerTeam("pl-11", "sport-track"), value: 3 },
    { ...playerTeam("pl-12", "sport-track"), value: 3 },
    { ...playerTeam("pl-1", "sport-track"), value: 2 },
    { ...playerTeam("pl-4", "sport-track"), value: 1 },
  ],
};

export const DEMO_STAT_LEADERS_VOLLEYBALL = {
  goals: [
    { ...playerTeam("pl-14", "sport-volleyball"), value: 86 },
    { ...playerTeam("pl-13", "sport-volleyball"), value: 72 },
    { ...playerTeam("pl-1", "sport-volleyball"), value: 68 },
    { ...playerTeam("pl-15", "sport-volleyball"), value: 61 },
  ],
  assists: [
    { ...playerTeam("pl-15", "sport-volleyball"), value: 28 },
    { ...playerTeam("pl-14", "sport-volleyball"), value: 22 },
    { ...playerTeam("pl-13", "sport-volleyball"), value: 18 },
    { ...playerTeam("pl-1", "sport-volleyball"), value: 14 },
  ],
  passes: [
    { ...playerTeam("pl-13", "sport-volleyball"), value: 22 },
    { ...playerTeam("pl-14", "sport-volleyball"), value: 18 },
    { ...playerTeam("pl-1", "sport-volleyball"), value: 15 },
    { ...playerTeam("pl-15", "sport-volleyball"), value: 11 },
  ],
  cleanSheets: [
    { ...playerTeam("pl-15", "sport-volleyball"), value: 94 },
    { ...playerTeam("pl-13", "sport-volleyball"), value: 88 },
    { ...playerTeam("pl-14", "sport-volleyball"), value: 81 },
    { ...playerTeam("pl-1", "sport-volleyball"), value: 76 },
  ],
};

export const DEMO_PLAYER_STATS = DEMO_STAT_LEADERS_FOOTBALL.goals.map((entry, i) => ({
  rank: i + 1,
  ...entry,
}));
