import type { Tournament } from "@/lib/types/database";

/**
 * Demo overlay for competitions created on the spot from the admin wizard.
 * Fixtures are materialised into the demo match store so the public match
 * list and the keeper's "available fixtures" pick them up immediately.
 */
export type DemoTournamentMeta = Tournament & {
  config: Record<string, unknown>;
  team_ids: string[];
};

export type DemoTournamentRosterEntry = {
  id: string;
  tournament_id: string;
  team_id: string;
  player_id: string;
  jersey_number: number | null;
  added_at: string;
};

let created: DemoTournamentMeta[] = [];
let rosters: DemoTournamentRosterEntry[] = [];
let rosterSeq = 0;

export function listCreatedDemoTournaments(sportId?: string): DemoTournamentMeta[] {
  return sportId ? created.filter((t) => t.sport_id === sportId) : [...created];
}

export function getCreatedDemoTournament(id: string): DemoTournamentMeta | null {
  return created.find((t) => t.id === id) ?? null;
}

export function archiveDemoTournament(id: string): boolean {
  const idx = created.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  created = created.map((t) => (t.id === id ? { ...t, is_draft: true } : t));
  return true;
}

export function registerDemoTournament(
  t: Tournament,
  opts?: { config?: Record<string, unknown>; team_ids?: string[] }
): DemoTournamentMeta {
  const meta: DemoTournamentMeta = {
    ...t,
    config: opts?.config ?? {},
    team_ids: opts?.team_ids ?? [],
  };
  created = [...created, meta];
  return meta;
}

export function listDemoTournamentRosters(
  tournamentId: string,
  teamId?: string | null
): DemoTournamentRosterEntry[] {
  return rosters.filter(
    (r) => r.tournament_id === tournamentId && (!teamId || r.team_id === teamId)
  );
}

export function addDemoTournamentRoster(input: {
  tournament_id: string;
  team_id: string;
  player_id: string;
  jersey_number?: number | null;
}): DemoTournamentRosterEntry | { error: string } {
  if (rosters.some((r) => r.tournament_id === input.tournament_id && r.player_id === input.player_id)) {
    return { error: "Player is already on this competition squad" };
  }
  rosterSeq += 1;
  const row: DemoTournamentRosterEntry = {
    id: `trost-${Date.now().toString(36)}-${rosterSeq}`,
    tournament_id: input.tournament_id,
    team_id: input.team_id,
    player_id: input.player_id,
    jersey_number: input.jersey_number ?? null,
    added_at: new Date().toISOString(),
  };
  rosters = [...rosters, row];
  return row;
}

export function removeDemoTournamentRoster(
  tournamentId: string,
  playerId: string
): boolean {
  const before = rosters.length;
  rosters = rosters.filter(
    (r) => !(r.tournament_id === tournamentId && r.player_id === playerId)
  );
  return rosters.length < before;
}

/** Next Saturday at 16:00 local time, `weeks` weeks ahead. */
export function nextMatchday(weeks = 0, hourOffset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const untilSat = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + untilSat + weeks * 7);
  d.setHours(16 + hourOffset, 0, 0, 0);
  return d.toISOString();
}
