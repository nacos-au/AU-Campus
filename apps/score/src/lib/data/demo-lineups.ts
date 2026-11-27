import { DEMO_PLAYERS } from "@/lib/data/demo";
import { parseFormation } from "@/lib/match/formation-layout";
import type { LineupSheetStatus, Player } from "@/lib/types/database";

export interface PitchLineupSlot {
  player_id: string;
  /** Null when the jersey number was not logged. Never invented. */
  jersey_number: number | null;
  is_captain?: boolean;
}

export interface TeamPitchLineup {
  match_id: string;
  team_id: string;
  formation: string;
  /** Rows from GK (index 0) to striker; each row is left-to-right on the pitch. */
  rows: PitchLineupSlot[][];
}

export interface SubmittedLineupEntry {
  player_id: string;
  is_starting: boolean;
  role?: string | null;
  is_captain?: boolean;
  jersey_number?: number | null;
}

export interface SubmittedLineup {
  match_id: string;
  team_id: string;
  players: SubmittedLineupEntry[];
  submitted_at: string;
  status?: LineupSheetStatus;
  published_at?: string | null;
  coach_name?: string | null;
  formation?: string | null;
}

/** 4-3-3: GK, back four (LB–RB), midfield three, front three (LW–ST–RW). */
const CSC_433: PitchLineupSlot[][] = [
  [{ player_id: "pl-3", jersey_number: 1 }],
  [
    { player_id: "pl-30", jersey_number: 2 },
    { player_id: "pl-16", jersey_number: 3, is_captain: true },
    { player_id: "pl-36", jersey_number: 5 },
    { player_id: "pl-2", jersey_number: 4 },
  ],
  [
    { player_id: "pl-17", jersey_number: 6 },
    { player_id: "pl-10", jersey_number: 11 },
    { player_id: "pl-37", jersey_number: 8 },
  ],
  [
    { player_id: "pl-38", jersey_number: 20 },
    { player_id: "pl-1", jersey_number: 9 },
    { player_id: "pl-31", jersey_number: 14 },
  ],
];

const MEC_433: PitchLineupSlot[][] = [
  [{ player_id: "pl-5", jersey_number: 1 }],
  [
    { player_id: "pl-32", jersey_number: 2 },
    { player_id: "pl-39", jersey_number: 3 },
    { player_id: "pl-33", jersey_number: 4 },
    { player_id: "pl-40", jersey_number: 5 },
  ],
  [
    { player_id: "pl-11", jersey_number: 6 },
    { player_id: "pl-19", jersey_number: 7 },
    { player_id: "pl-41", jersey_number: 8 },
  ],
  [
    { player_id: "pl-42", jersey_number: 11 },
    { player_id: "pl-4", jersey_number: 9, is_captain: true },
    { player_id: "pl-43", jersey_number: 10 },
  ],
];

const LAW_433: PitchLineupSlot[][] = [
  [{ player_id: "pl-44", jersey_number: 1 }],
  [
    { player_id: "pl-45", jersey_number: 2 },
    { player_id: "pl-8", jersey_number: 3, is_captain: true },
    { player_id: "pl-46", jersey_number: 4 },
    { player_id: "pl-47", jersey_number: 5 },
  ],
  [
    { player_id: "pl-18", jersey_number: 6 },
    { player_id: "pl-48", jersey_number: 7 },
    { player_id: "pl-49", jersey_number: 8 },
  ],
  [
    { player_id: "pl-50", jersey_number: 10 },
    { player_id: "pl-51", jersey_number: 9 },
    { player_id: "pl-52", jersey_number: 11 },
  ],
];

const DEMO_PITCH_LINEUPS: TeamPitchLineup[] = [
  { match_id: "match-1", team_id: "team-csc-fc", formation: "4-3-3", rows: CSC_433 },
  { match_id: "match-1", team_id: "team-mec-giants", formation: "4-3-3", rows: MEC_433 },
  { match_id: "match-15", team_id: "team-csc-fc", formation: "4-3-3", rows: CSC_433 },
  { match_id: "match-15", team_id: "team-mec-giants", formation: "4-3-3", rows: MEC_433 },
  { match_id: "match-3", team_id: "team-law-barristers", formation: "4-3-3", rows: LAW_433 },
  { match_id: "match-3", team_id: "team-csc-fc", formation: "4-3-3", rows: CSC_433 },
];

/**
 * Lineups saved in demo mode (staff entry or an approved rep XI). Kept on globalThis so
 * API routes and server-rendered match pages share them.
 */
const DEMO_SUBMITTED_LINEUPS: SubmittedLineup[] = ((globalThis as typeof globalThis & {
  __auScoreDemoSubmittedLineups?: SubmittedLineup[];
}).__auScoreDemoSubmittedLineups ??= []);

/** Save a demo lineup for one side of a match (replaces any earlier one for that side). */
export function setDemoSubmittedLineup(lineup: SubmittedLineup): void {
  const idx = DEMO_SUBMITTED_LINEUPS.findIndex(
    (l) => l.match_id === lineup.match_id && l.team_id === lineup.team_id
  );
  if (idx >= 0) DEMO_SUBMITTED_LINEUPS.splice(idx, 1);
  DEMO_SUBMITTED_LINEUPS.push(lineup);
}

export function getPitchLineup(matchId: string, teamId: string): TeamPitchLineup | null {
  return DEMO_PITCH_LINEUPS.find((l) => l.match_id === matchId && l.team_id === teamId) ?? null;
}

export function countPitchPlayers(lineup: TeamPitchLineup): number {
  return lineup.rows.reduce((sum, row) => sum + row.length, 0);
}

export function getSubmittedLineup(matchId: string, teamId: string): SubmittedLineup | null {
  return (
    DEMO_SUBMITTED_LINEUPS.find((l) => l.match_id === matchId && l.team_id === teamId) ?? null
  );
}

export function resolveLineupPlayers(lineup: SubmittedLineup): (Player & { is_starting: boolean; lineup_role?: string | null })[] {
  return lineup.players.flatMap((entry) => {
    const player = DEMO_PLAYERS.find((p) => p.id === entry.player_id);
    return player ? [{ ...player, is_starting: entry.is_starting, lineup_role: entry.role }] : [];
  });
}

export function resolvePitchSlotPlayer(
  slot: PitchLineupSlot,
  playersById?: Map<string, Player> | Record<string, Player>
): (Player & PitchLineupSlot) | null {
  let player: Player | undefined;
  if (playersById instanceof Map) {
    player = playersById.get(slot.player_id);
  } else if (playersById) {
    player = playersById[slot.player_id];
  }
  if (!player) {
    player = DEMO_PLAYERS.find((p) => p.id === slot.player_id);
  }
  return player ? { ...player, ...slot } : null;
}

/** Build pitch rows from flat XI + formation string (GK first, then back-to-front). */
export function buildPitchRows(
  formation: string,
  starters: PitchLineupSlot[]
): PitchLineupSlot[][] {
  const lines = parseFormation(formation);
  const rows: PitchLineupSlot[][] = [];
  let idx = 0;

  if (starters.length < 1) return rows;

  rows.push([starters[idx++]]);
  for (const count of lines) {
    rows.push(starters.slice(idx, idx + count));
    idx += count;
  }
  return rows;
}

const DEFAULT_FORMATION = "4-3-3";

/** Softascore-style pitch XI from resolved starters (DB or predicted pool). */
export function buildTeamPitchLineup(opts: {
  matchId: string;
  teamId: string;
  formation?: string | null;
  starters: Array<{
    id: string;
    jersey_number?: number | null;
    is_captain?: boolean;
  }>;
}): TeamPitchLineup | null {
  if (!opts.starters.length) return null;
  const formation = opts.formation?.trim() || DEFAULT_FORMATION;
  const slots: PitchLineupSlot[] = opts.starters.map((p) => ({
    player_id: p.id,
    jersey_number: p.jersey_number && p.jersey_number > 0 ? p.jersey_number : null,
    is_captain: p.is_captain,
  }));
  const rows = buildPitchRows(formation, slots);
  if (!rows.length) return null;
  return {
    match_id: opts.matchId,
    team_id: opts.teamId,
    formation,
    rows,
  };
}
