import type { PeriodScore, SetScore, TrackResult } from "@/lib/types/database";
import { DEMO_DEPARTMENTS, DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/data/demo";
import { playerAvatarForId } from "@/lib/utils/sport-assets";

export interface DemoMatchEvent {
  id: string;
  match_id: string;
  player: (typeof DEMO_PLAYERS)[number];
  team_id: string;
  team_name: string;
  team_code: string;
  team_logo_url: string | null;
  event_type: string;
  match_time: string;
  period: string;
  details: Record<string, unknown> | null;
}

function teamEvent(teamId: string) {
  const team = DEMO_TEAMS.find((t) => t.id === teamId)!;
  const dept = DEMO_DEPARTMENTS.find((d) => d.id === team.department_id);
  return {
    team_id: team.id,
    team_name: team.name,
    team_code: dept?.short_code ?? "AU",
    team_logo_url: team.logo_url,
  };
}

function playerTeamEvent(playerId: string, sportId: string) {
  const player = DEMO_PLAYERS.find((p) => p.id === playerId)!;
  const team = DEMO_TEAMS.find((t) => t.department_id === player.department_id && t.sport_id === sportId);
  if (team) return teamEvent(team.id);
  const dept = DEMO_DEPARTMENTS.find((d) => d.id === player.department_id);
  return {
    team_id: dept?.id ?? "unknown",
    team_name: dept?.name ?? "Unknown",
    team_code: dept?.short_code ?? "AU",
    team_logo_url: null,
  };
}

export const DEMO_PERIOD_SCORES: Record<string, PeriodScore[]> = {
  "match-4": [
    { period: "quarter_1", label: "Q1", home_score: 18, away_score: 22 },
    { period: "quarter_2", label: "Q2", home_score: 20, away_score: 18 },
    { period: "quarter_3", label: "Q3", home_score: 20, away_score: 21 },
  ],
  "match-6": [
    { period: "quarter_1", label: "Q1", home_score: 19, away_score: 16 },
    { period: "quarter_2", label: "Q2", home_score: 18, away_score: 20 },
    { period: "quarter_3", label: "Q3", home_score: 17, away_score: 15 },
    { period: "quarter_4", label: "Q4", home_score: 18, away_score: 17 },
  ],
  "match-3": [
    { period: "half_1", label: "1st Half", home_score: 0, away_score: 1 },
    { period: "half_2", label: "2nd Half", home_score: 0, away_score: 2 },
  ],
  "match-15": [
    { period: "half_1", label: "1st Half", home_score: 1, away_score: 0 },
    { period: "half_2", label: "2nd Half", home_score: 1, away_score: 2 },
    { period: "extra_time", label: "Extra Time", home_score: 2, away_score: 2 },
  ],
};

export const DEMO_SET_SCORES: Record<string, SetScore[]> = {
  "match-7": [
    { set_number: 1, home_games: 6, away_games: 4 },
    { set_number: 2, home_games: 3, away_games: 2 },
  ],
  "match-9": [
    { set_number: 1, home_games: 6, away_games: 3 },
    { set_number: 2, home_games: 4, away_games: 6 },
    { set_number: 3, home_games: 7, away_games: 5, tiebreak: true },
  ],
  "match-12": [
    { set_number: 1, home_games: 25, away_games: 22 },
    { set_number: 2, home_games: 23, away_games: 25 },
    { set_number: 3, home_games: 25, away_games: 20 },
    { set_number: 4, home_games: 18, away_games: 14 },
  ],
  "match-14": [
    { set_number: 1, home_games: 25, away_games: 18 },
    { set_number: 2, home_games: 22, away_games: 25 },
    { set_number: 3, home_games: 25, away_games: 21 },
    { set_number: 4, home_games: 25, away_games: 19 },
  ],
  "match-16": [
    { set_number: 1, home_games: 6, away_games: 4 },
    { set_number: 2, home_games: 7, away_games: 6, tiebreak: true },
  ],
};

export const DEMO_TRACK_RESULTS: Record<string, TrackResult[]> = {
  "match-10": [
    { rank: 1, lane: 4, player_id: "pl-11", athlete_name: "James Adebola", department_code: "MEC", time_ms: 10580, time_display: "10.58", avatar_url: playerAvatarForId("pl-11") },
    { rank: 2, lane: 5, player_id: "pl-12", athlete_name: "Grace Etim", department_code: "BIO", time_ms: 10720, time_display: "10.72", avatar_url: playerAvatarForId("pl-12") },
    { rank: 3, lane: 3, player_id: "pl-1", athlete_name: "Adaeze Okonkwo", department_code: "CSC", time_ms: 10890, time_display: "10.89", avatar_url: playerAvatarForId("pl-1") },
    { rank: 4, lane: 6, player_id: "pl-4", athlete_name: "Tunde Bakare", department_code: "MEC", time_ms: 11050, time_display: "11.05", avatar_url: playerAvatarForId("pl-4") },
  ],
};

export const DEMO_EVENTS_BY_MATCH: Record<string, DemoMatchEvent[]> = {
  "match-1": [
    { id: "ev-1", match_id: "match-1", player: DEMO_PLAYERS[0], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "12'", period: "half_1", details: { assist_player_name: "C. Eze", assist_player_id: "pl-2" } },
    { id: "ev-2", match_id: "match-1", player: DEMO_PLAYERS[3], ...teamEvent("team-mec-giants"), event_type: "goal", match_time: "28'", period: "half_1", details: null },
    { id: "ev-3", match_id: "match-1", player: DEMO_PLAYERS[0], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "36'", period: "half_1", details: null },
    { id: "ev-4", match_id: "match-1", player: DEMO_PLAYERS[4], ...teamEvent("team-mec-giants"), event_type: "yellow_card", match_time: "38'", period: "half_1", details: { foul_label: "Foul" } },
  ],
  "match-4": [
    { id: "ev-b1", match_id: "match-4", player: DEMO_PLAYERS[8], ...playerTeamEvent("pl-9", "sport-basketball"), event_type: "field_goal", match_time: "Q3 02:14", period: "quarter_3", details: { points: 3 } },
    { id: "ev-b2", match_id: "match-4", player: DEMO_PLAYERS[0], ...playerTeamEvent("pl-1", "sport-basketball"), event_type: "two_pointer", match_time: "Q3 05:41", period: "quarter_3", details: { points: 2 } },
    { id: "ev-b3", match_id: "match-4", player: DEMO_PLAYERS[8], ...playerTeamEvent("pl-9", "sport-basketball"), event_type: "free_throw", match_time: "Q3 07:22", period: "quarter_3", details: { points: 1 } },
  ],
  "match-7": [
    { id: "ev-t1", match_id: "match-7", player: DEMO_PLAYERS[9], ...teamEvent("team-csc-tennis"), event_type: "ace", match_time: "Set 1", period: "set_1", details: null },
    { id: "ev-t2", match_id: "match-7", player: DEMO_PLAYERS[9], ...teamEvent("team-csc-tennis"), event_type: "break_point_won", match_time: "Set 2", period: "set_2", details: null },
  ],
  "match-12": [
    { id: "ev-v1", match_id: "match-12", player: DEMO_PLAYERS[12], ...teamEvent("team-csc-volley"), event_type: "kill", match_time: "Set 4", period: "set_4", details: null },
    { id: "ev-v2", match_id: "match-12", player: DEMO_PLAYERS[13], ...teamEvent("team-mec-volley"), event_type: "block", match_time: "Set 4", period: "set_4", details: null },
    { id: "ev-v3", match_id: "match-12", player: DEMO_PLAYERS[12], ...teamEvent("team-csc-volley"), event_type: "ace", match_time: "Set 4", period: "set_4", details: null },
  ],
  "match-10": [
    { id: "ev-tr1", match_id: "match-10", player: DEMO_PLAYERS[10], ...playerTeamEvent("pl-11", "sport-track"), event_type: "finish", match_time: "10.58", period: "final", details: { rank: 1, lane: 4 } },
    { id: "ev-tr2", match_id: "match-10", player: DEMO_PLAYERS[11], ...playerTeamEvent("pl-12", "sport-track"), event_type: "finish", match_time: "10.72", period: "final", details: { rank: 2, lane: 5 } },
    { id: "ev-tr3", match_id: "match-10", player: DEMO_PLAYERS[0], ...playerTeamEvent("pl-1", "sport-track"), event_type: "finish", match_time: "10.89", period: "final", details: { rank: 3, lane: 3 } },
  ],
  "match-15": [
    { id: "ev-p0a", match_id: "match-15", player: DEMO_PLAYERS[4], ...teamEvent("team-mec-giants"), event_type: "yellow_card", match_time: "27'", period: "half_1", details: { foul_label: "Foul" } },
    { id: "ev-p1", match_id: "match-15", player: DEMO_PLAYERS[0], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "34'", period: "half_1", details: { assist_player_name: "C. Eze" } },
    { id: "ev-p1b", match_id: "match-15", player: DEMO_PLAYERS[17], ...teamEvent("team-csc-fc"), event_type: "substitution", match_time: "58'", period: "half_2", details: { player_out_name: "M. Okoro", player_out_id: "pl-16" } },
    { id: "ev-p2", match_id: "match-15", player: DEMO_PLAYERS[3], ...teamEvent("team-mec-giants"), event_type: "goal", match_time: "67'", period: "half_2", details: null },
    { id: "ev-p2b", match_id: "match-15", player: DEMO_PLAYERS[5], ...teamEvent("team-mec-giants"), event_type: "red_card", match_time: "74'", period: "half_2", details: { foul_label: "Foul" } },
    { id: "ev-p2c", match_id: "match-15", player: DEMO_PLAYERS[17], ...teamEvent("team-csc-fc"), event_type: "substitution", match_time: "75'", period: "half_2", details: { player_out_name: "J. Torres", player_out_id: "pl-16" } },
    { id: "ev-p3", match_id: "match-15", player: DEMO_PLAYERS[3], ...teamEvent("team-mec-giants"), event_type: "goal", match_time: "88'", period: "half_2", details: null },
    { id: "ev-p4", match_id: "match-15", player: DEMO_PLAYERS[1], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "90+3'", period: "half_2", details: null },
    { id: "ev-p5", match_id: "match-15", player: DEMO_PLAYERS[0], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "ET 105'", period: "extra_time", details: null },
    { id: "ev-p6", match_id: "match-15", player: DEMO_PLAYERS[4], ...teamEvent("team-mec-giants"), event_type: "goal", match_time: "ET 112'", period: "extra_time", details: null },
    { id: "ev-p7", match_id: "match-15", player: DEMO_PLAYERS[0], ...teamEvent("team-csc-fc"), event_type: "penalty_scored", match_time: "Pens", period: "penalty_shootout", details: null },
    { id: "ev-p8", match_id: "match-15", player: DEMO_PLAYERS[3], ...teamEvent("team-mec-giants"), event_type: "penalty_missed", match_time: "Pens", period: "penalty_shootout", details: null },
  ],
  "match-3": [
    { id: "ev-m3-1", match_id: "match-3", player: DEMO_PLAYERS[0], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "22'", period: "half_1", details: { assist_player_name: "C. Eze" } },
    { id: "ev-m3-2", match_id: "match-3", player: DEMO_PLAYERS[1], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "55'", period: "half_2", details: null },
    { id: "ev-m3-3", match_id: "match-3", player: DEMO_PLAYERS[7], ...teamEvent("team-law-barristers"), event_type: "yellow_card", match_time: "61'", period: "half_2", details: { foul_label: "Foul" } },
    { id: "ev-m3-4", match_id: "match-3", player: DEMO_PLAYERS[0], ...teamEvent("team-csc-fc"), event_type: "goal", match_time: "78'", period: "half_2", details: null },
  ],
  "match-16": [
    { id: "ev-d1", match_id: "match-16", player: DEMO_PLAYERS[9], ...teamEvent("team-csc-tennis"), event_type: "ace", match_time: "Set 1", period: "set_1", details: { partner_name: "Adaeze Okonkwo" } },
    { id: "ev-d2", match_id: "match-16", player: DEMO_PLAYERS[4], ...teamEvent("team-mec-tennis"), event_type: "break_point_won", match_time: "Set 2 TB", period: "set_2", details: { partner_name: "Fatima Ibrahim" } },
  ],
};

export function getPeriodScoresForMatch(matchId: string): PeriodScore[] {
  return DEMO_PERIOD_SCORES[matchId] ?? [];
}

export function getSetScoresForMatch(matchId: string): SetScore[] {
  return DEMO_SET_SCORES[matchId] ?? [];
}

export function getTrackResultsForMatch(matchId: string): TrackResult[] {
  return DEMO_TRACK_RESULTS[matchId] ?? [];
}

export function getEventsForMatch(matchId: string): DemoMatchEvent[] {
  return DEMO_EVENTS_BY_MATCH[matchId] ?? [];
}

export function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ");
}
