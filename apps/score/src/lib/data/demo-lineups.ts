import { DEMO_PLAYERS } from "@/lib/data/demo";
import type { Player } from "@/lib/types/database";

/**
 * Club-submitted match lineups. Clubs submit before kickoff; if a club never
 * submits, the lineup is simply "not available" — the public match page says
 * so, and the record keeper falls back to the full squad roster.
 */
export interface SubmittedLineupEntry {
  player_id: string;
  is_starting: boolean;
  role?: string | null;
}

export interface SubmittedLineup {
  match_id: string;
  team_id: string;
  players: SubmittedLineupEntry[];
  submitted_at: string;
}

/** Demo: only the home side of match-1 submitted a lineup — away shows "Not available". */
const DEMO_SUBMITTED_LINEUPS: SubmittedLineup[] = [
  {
    match_id: "match-1",
    team_id: "team-csc-fc",
    submitted_at: "2026-07-27T09:00:00Z",
    players: [
      { player_id: "pl-3", is_starting: true, role: "GK" },
      { player_id: "pl-16", is_starting: true, role: "DEF" },
      { player_id: "pl-30", is_starting: true, role: "DEF" },
      { player_id: "pl-2", is_starting: true, role: "MID" },
      { player_id: "pl-17", is_starting: true, role: "MID" },
      { player_id: "pl-1", is_starting: true, role: "FWD" },
      { player_id: "pl-31", is_starting: true, role: "FWD" },
    ],
  },
];

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
