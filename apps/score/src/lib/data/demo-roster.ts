import type { Department, Player, Team } from "@/lib/types/database";
import { DEMO_DEPARTMENTS, DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/data/demo";
import { listGuestTeams, updateGuestTeamLogo } from "@/lib/data/demo-guest-teams";
import type { SquadPlayer } from "@/lib/data/demo-squads";
import { primaryPosition } from "@/lib/roster/positions";
import { logoForSportId } from "@/lib/utils/sport-assets";

/**
 * Demo-mode overlay for bulk-imported departments, teams and players.
 * Mirrors the production tables (departments / teams / players /
 * player_sport_registry) so the same UI flows can be exercised locally.
 */
let departments: Department[] = [];
let teams: Team[] = [];
let players: Player[] = [];
let registry: Array<{ player_id: string; team_id: string; jersey_number: number | null; squad_role: string | null }> = [];

let seq = 0;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-import-${Date.now().toString(36)}-${seq}`;
}

export function listDemoDepartments(): Department[] {
  return [...DEMO_DEPARTMENTS, ...departments];
}

/** AU department teams (fixtures + imported). Guests are listed separately. */
export function listDemoTeams(sportId?: string): Team[] {
  const overlayIds = new Set(teams.map((t) => t.id));
  const all = [
    ...DEMO_TEAMS.filter((t) => !overlayIds.has(t.id)),
    ...teams,
  ].filter((t) => !t.deleted_at);
  return sportId ? all.filter((t) => t.sport_id === sportId) : all;
}

/** Everything that can be picked as a side — department teams and guests. */
export function listDemoTeamsWithGuests(sportId?: string): Team[] {
  return [...listDemoTeams(sportId), ...listGuestTeams(sportId)];
}

export function findDemoTeam(id: string): Team | undefined {
  return listDemoTeamsWithGuests().find((t) => t.id === id);
}

export function listDemoPlayers(): Player[] {
  const overlayIds = new Set(players.map((p) => p.id));
  return [...DEMO_PLAYERS.filter((p) => !overlayIds.has(p.id)), ...players];
}

/** Imported squad members for a team (empty when nothing was imported). */
export function getImportedSquadForTeam(teamId: string): SquadPlayer[] {
  const rows = registry.filter((r) => r.team_id === teamId);
  const out: SquadPlayer[] = [];
  for (const r of rows) {
    const p = players.find((x) => x.id === r.player_id) ?? DEMO_PLAYERS.find((x) => x.id === r.player_id);
    if (!p) continue;
    out.push({
      ...p,
      jersey_number: r.jersey_number ?? undefined,
      squad_role: r.squad_role ?? p.position ?? "Player",
    });
  }
  return out;
}

/* ───────────────────────────── import ───────────────────────────── */

export interface RosterTeamInput {
  name: string;
  department_code: string;
  department_name?: string | null;
}

export interface RosterPlayerInput {
  first_name: string;
  last_name: string;
  nickname?: string | null;
  matric_number?: string | null;
  position?: string | null;
  jersey_number?: number | null;
  /** Resolve the team by id (preferred) or by name within the sport. */
  team_id?: string | null;
  team_name?: string | null;
}

export interface RosterImportInput {
  sport_id: string;
  teams: RosterTeamInput[];
  players: RosterPlayerInput[];
}

export interface RosterImportResult {
  departments_created: number;
  teams_created: number;
  teams_existing: number;
  players_created: number;
  players_existing: number;
  registrations: number;
  errors: string[];
}

function codeFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

export function importDemoRoster(input: RosterImportInput): RosterImportResult {
  const result: RosterImportResult = {
    departments_created: 0,
    teams_created: 0,
    teams_existing: 0,
    players_created: 0,
    players_existing: 0,
    registrations: 0,
    errors: [],
  };

  function ensureDepartment(code: string, name?: string | null): Department {
    const key = code.toUpperCase();
    const existing = listDemoDepartments().find((d) => d.short_code.toUpperCase() === key);
    if (existing) return existing;
    const dept: Department = {
      id: nextId("dept"),
      name: name?.trim() || key,
      short_code: key,
      created_at: new Date().toISOString(),
    };
    departments = [...departments, dept];
    result.departments_created += 1;
    return dept;
  }

  for (const t of input.teams) {
    const name = t.name.trim();
    if (!name) continue;
    const code = (t.department_code || codeFromName(name)).toUpperCase();
    const dept = ensureDepartment(code, t.department_name);
    const dup = listDemoTeams(input.sport_id).find(
      (x) => x.name.toLowerCase() === name.toLowerCase() || x.department_id === dept.id
    );
    if (dup) {
      result.teams_existing += 1;
      continue;
    }
    teams = [
      ...teams,
      {
        id: nextId("team"),
        department_id: dept.id,
        sport_id: input.sport_id,
        name,
        logo_url: logoForSportId(input.sport_id),
        department: dept,
        deleted_at: null,
      },
    ];
    result.teams_created += 1;
  }

  for (const p of input.players) {
    const first = p.first_name.trim();
    const last = p.last_name.trim();
    if (!first && !last) continue;

    const team =
      (p.team_id ? findDemoTeam(p.team_id) : undefined) ??
      (p.team_name
        ? listDemoTeams(input.sport_id).find((t) => t.name.toLowerCase() === p.team_name!.trim().toLowerCase())
        : undefined);
    if (!team) {
      result.errors.push(`${first} ${last}: no team matched “${p.team_name ?? p.team_id ?? "—"}”`);
      continue;
    }

    const matric = p.matric_number?.trim().toUpperCase() || null;
    let player =
      (matric && listDemoPlayers().find((x) => x.matric_number?.toUpperCase() === matric)) ||
      listDemoPlayers().find(
        (x) =>
          x.first_name.toLowerCase() === first.toLowerCase() &&
          x.last_name.toLowerCase() === last.toLowerCase() &&
          (!team.department_id || x.department_id === team.department_id)
      );

    if (player) {
      result.players_existing += 1;
    } else {
      player = {
        id: nextId("pl"),
        department_id: team.department_id ?? "",
        first_name: first,
        last_name: last,
        matric_number: matric,
        avatar_url: null,
        position: p.position ?? null,
      };
      players = [...players, player];
      result.players_created += 1;
    }

    const already = registry.find((r) => r.player_id === player!.id && r.team_id === team.id);
    if (!already) {
      registry = [
        ...registry,
        {
          player_id: player.id,
          team_id: team.id,
          jersey_number: p.jersey_number ?? null,
          squad_role: primaryPosition(p.position) ?? "Squad",
        },
      ];
    }
    result.registrations += 1;
  }

  return result;
}

export interface RosterPlayerRow extends Player {
  team_id: string;
  team_name: string;
  jersey_number: number | null;
  squad_role: string | null;
}

/** Players registered to teams in a sport (demo fixtures + imports). */
export function listDemoRosterPlayers(sportId?: string, teamId?: string | null): RosterPlayerRow[] {
  const sportTeams = listDemoTeams(sportId);
  const teamById = new Map(sportTeams.map((t) => [t.id, t]));
  const out: RosterPlayerRow[] = [];

  for (const r of registry) {
    if (teamId && r.team_id !== teamId) continue;
    const team = teamById.get(r.team_id);
    if (!team) continue;
    const p = players.find((x) => x.id === r.player_id) ?? DEMO_PLAYERS.find((x) => x.id === r.player_id);
    if (!p) continue;
    out.push({
      ...p,
      team_id: team.id,
      team_name: team.name,
      jersey_number: r.jersey_number,
      squad_role: r.squad_role,
    });
  }

  // Seed squads for demo teams that have no import overlay yet.
  const allPlayers = listDemoPlayers();
  if (!teamId) {
    for (const team of sportTeams) {
      if (out.some((r) => r.team_id === team.id)) continue;
      const seed = allPlayers.filter((p) => p.department_id === team.department_id).slice(0, 8);
      for (const p of seed) {
        out.push({
          ...p,
          team_id: team.id,
          team_name: team.name,
          jersey_number: null,
          squad_role: p.position,
        });
      }
    }
  } else {
    const team = teamById.get(teamId);
    if (team && !out.length) {
      for (const p of allPlayers.filter((x) => x.department_id === team.department_id).slice(0, 12)) {
        out.push({
          ...p,
          team_id: team.id,
          team_name: team.name,
          jersey_number: null,
          squad_role: p.position,
        });
      }
    }
  }

  return out.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
}

export function updateDemoTeamLogo(teamId: string, logoUrl: string): Team | null {
  const guest = updateGuestTeamLogo(teamId, logoUrl);
  if (guest) return guest;

  const idx = teams.findIndex((t) => t.id === teamId);
  if (idx >= 0) {
    const next = { ...teams[idx], logo_url: logoUrl };
    teams = [...teams.slice(0, idx), next, ...teams.slice(idx + 1)];
    return next;
  }
  // Base fixture team — clone into overlay so logo persists for the session
  const base = DEMO_TEAMS.find((t) => t.id === teamId);
  if (!base) return null;
  const cloned = { ...base, logo_url: logoUrl };
  teams = [...teams, cloned];
  return cloned;
}

export function updateDemoPlayerAvatar(playerId: string, avatarUrl: string): Player | null {
  const idx = players.findIndex((p) => p.id === playerId);
  if (idx >= 0) {
    const next = { ...players[idx], avatar_url: avatarUrl };
    players = [...players.slice(0, idx), next, ...players.slice(idx + 1)];
    return next;
  }
  const base = DEMO_PLAYERS.find((p) => p.id === playerId);
  if (!base) return null;
  const cloned = { ...base, avatar_url: avatarUrl };
  players = [...players, cloned];
  return cloned;
}
