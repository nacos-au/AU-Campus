import type { Player } from "@/lib/types/database";
import { DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/data/demo";
import { getImportedSquadForTeam } from "@/lib/data/demo-roster";
import {
  DEMO_BASKETBALL_TOURNAMENT,
  DEMO_TENNIS_TOURNAMENT,
  DEMO_VOLLEYBALL_TOURNAMENT,
} from "@/lib/data/demo-competition";

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  GK: 0,
  Keeper: 0,
  Defender: 1,
  Midfielder: 2,
  Guard: 1,
  Center: 2,
  Forward: 3,
  Setter: 1,
  Libero: 1,
  "Outside Hitter": 2,
  "Middle Blocker": 2,
  Singles: 1,
  Doubles: 2,
  Sprinter: 1,
};

type RosterEntry = { player_id: string; jersey_number: number; squad_role: string };

function roster(entries: RosterEntry[]): RosterEntry[] {
  return entries;
}

function fb(team: string, starters: [string, number][], subs: [string, number][], reserves: [string, number][]): RosterEntry[] {
  return roster([
    ...starters.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Starting XI" })),
    ...subs.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Substitutes" })),
    ...reserves.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Reserves" })),
  ]);
}

function bball(starters: [string, number][], bench: [string, number][], reserves: [string, number][]): RosterEntry[] {
  return roster([
    ...starters.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Starting Five" })),
    ...bench.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Bench" })),
    ...reserves.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Reserves" })),
  ]);
}

function volley(starters: [string, number][], bench: [string, number][], reserves: [string, number][]): RosterEntry[] {
  return roster([
    ...starters.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Starting Six" })),
    ...bench.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Bench" })),
    ...reserves.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Reserves" })),
  ]);
}

function tennis(singles: [string, number][], doubles: [string, number][], reserves: [string, number][]): RosterEntry[] {
  return roster([
    ...singles.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Singles" })),
    ...doubles.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Doubles" })),
    ...reserves.map(([id, num]) => ({ player_id: id, jersey_number: num, squad_role: "Reserves" })),
  ]);
}

export interface SquadPlayer extends Player {
  jersey_number?: number;
  squad_role: string;
}

export interface ClubCompetition {
  tournament_id: string;
  name: string;
  sport_id: string;
  href: string;
}

const DEMO_SQUAD_ROSTER: Record<string, RosterEntry[]> = {
  "team-csc-fc": fb("csc", [
    ["pl-3", 1], ["pl-30", 2], ["pl-16", 3], ["pl-2", 4], ["pl-17", 6],
    ["pl-1", 9], ["pl-10", 11], ["pl-31", 14], ["pl-16", 15], ["pl-30", 18], ["pl-17", 22],
  ], [
    ["pl-2", 7], ["pl-1", 19], ["pl-10", 20], ["pl-31", 21], ["pl-3", 23], ["pl-16", 24], ["pl-17", 25],
  ], [
    ["pl-30", 26], ["pl-31", 27], ["pl-2", 28], ["pl-1", 29], ["pl-10", 30],
  ]),
  "team-mec-giants": fb("mec", [
    ["pl-5", 1], ["pl-32", 2], ["pl-33", 4], ["pl-4", 5], ["pl-11", 6],
    ["pl-19", 7], ["pl-32", 8], ["pl-4", 9], ["pl-5", 10], ["pl-33", 11], ["pl-11", 12],
  ], [
    ["pl-19", 13], ["pl-32", 14], ["pl-33", 15], ["pl-4", 16], ["pl-5", 17], ["pl-11", 18], ["pl-19", 19],
  ], [
    ["pl-32", 20], ["pl-33", 21], ["pl-4", 22], ["pl-5", 23], ["pl-11", 24],
  ]),
  "team-eee-strikers": fb("eee", [
    ["pl-6", 1], ["pl-34", 2], ["pl-15", 3], ["pl-20", 4], ["pl-6", 5],
    ["pl-34", 6], ["pl-15", 7], ["pl-20", 8], ["pl-6", 9], ["pl-34", 10], ["pl-15", 11],
  ], [
    ["pl-20", 12], ["pl-6", 13], ["pl-34", 14], ["pl-15", 15], ["pl-20", 16], ["pl-6", 17], ["pl-34", 18],
  ], [
    ["pl-15", 19], ["pl-20", 20], ["pl-6", 21], ["pl-34", 22], ["pl-15", 23],
  ]),
  "team-bio-wolves": fb("bio", [
    ["pl-7", 1], ["pl-35", 2], ["pl-12", 3], ["pl-7", 4], ["pl-35", 5],
    ["pl-12", 6], ["pl-7", 7], ["pl-35", 8], ["pl-12", 9], ["pl-7", 10], ["pl-35", 11],
  ], [
    ["pl-12", 12], ["pl-7", 13], ["pl-35", 14], ["pl-12", 15], ["pl-7", 16], ["pl-35", 17], ["pl-12", 18],
  ], [
    ["pl-7", 19], ["pl-35", 20], ["pl-12", 21], ["pl-7", 22], ["pl-35", 23],
  ]),
  "team-law-barristers": fb("law", [
    ["pl-8", 1], ["pl-18", 2], ["pl-8", 3], ["pl-18", 4], ["pl-8", 5],
    ["pl-18", 6], ["pl-8", 7], ["pl-18", 8], ["pl-8", 9], ["pl-18", 10], ["pl-8", 11],
  ], [
    ["pl-18", 12], ["pl-8", 13], ["pl-18", 14], ["pl-8", 15], ["pl-18", 16], ["pl-8", 17], ["pl-18", 18],
  ], [
    ["pl-8", 19], ["pl-18", 20], ["pl-8", 21], ["pl-18", 22], ["pl-8", 23],
  ]),
  "team-csc-hoops": bball(
    [["pl-1", 1], ["pl-2", 3], ["pl-10", 5], ["pl-16", 11], ["pl-17", 23]],
    [["pl-30", 0], ["pl-31", 4], ["pl-1", 7], ["pl-2", 12], ["pl-10", 14], ["pl-16", 21], ["pl-17", 32]],
    [["pl-30", 8], ["pl-31", 15], ["pl-3", 33]]
  ),
  "team-med-court": bball(
    [["pl-9", 0], ["pl-9", 1], ["pl-9", 3], ["pl-9", 11], ["pl-9", 23]],
    [["pl-9", 4], ["pl-9", 5], ["pl-9", 7], ["pl-9", 12], ["pl-9", 14], ["pl-9", 21], ["pl-9", 32]],
    [["pl-9", 8], ["pl-9", 15], ["pl-9", 33]]
  ),
  "team-mec-hoops": bball(
    [["pl-4", 1], ["pl-5", 3], ["pl-11", 5], ["pl-19", 11], ["pl-32", 23]],
    [["pl-33", 0], ["pl-4", 4], ["pl-5", 7], ["pl-11", 12], ["pl-19", 14], ["pl-32", 21], ["pl-33", 32]],
    [["pl-4", 8], ["pl-5", 15], ["pl-11", 33]]
  ),
  "team-eee-hoops": bball(
    [["pl-6", 1], ["pl-15", 3], ["pl-20", 5], ["pl-34", 11], ["pl-6", 23]],
    [["pl-15", 0], ["pl-20", 4], ["pl-34", 7], ["pl-6", 12], ["pl-15", 14], ["pl-20", 21], ["pl-34", 32]],
    [["pl-6", 8], ["pl-15", 15], ["pl-20", 33]]
  ),
  "team-csc-volley": volley(
    [["pl-13", 1], ["pl-1", 3], ["pl-10", 5], ["pl-16", 7], ["pl-17", 9], ["pl-30", 11]],
    [["pl-31", 2], ["pl-2", 4], ["pl-1", 6], ["pl-10", 8], ["pl-16", 10], ["pl-17", 12]],
    [["pl-30", 14], ["pl-31", 16]]
  ),
  "team-mec-volley": volley(
    [["pl-14", 1], ["pl-4", 3], ["pl-5", 5], ["pl-11", 7], ["pl-32", 9], ["pl-33", 11]],
    [["pl-19", 2], ["pl-14", 4], ["pl-4", 6], ["pl-5", 8], ["pl-11", 10], ["pl-32", 12]],
    [["pl-33", 14], ["pl-19", 16]]
  ),
  "team-eee-volley": volley(
    [["pl-13", 1], ["pl-15", 3], ["pl-6", 5], ["pl-20", 7], ["pl-34", 9], ["pl-15", 11]],
    [["pl-6", 2], ["pl-20", 4], ["pl-34", 6], ["pl-13", 8], ["pl-15", 10], ["pl-6", 12]],
    [["pl-20", 14], ["pl-34", 16]]
  ),
  "team-bio-volley": volley(
    [["pl-14", 1], ["pl-7", 3], ["pl-12", 5], ["pl-35", 7], ["pl-7", 9], ["pl-12", 11]],
    [["pl-35", 2], ["pl-14", 4], ["pl-7", 6], ["pl-12", 8], ["pl-35", 10], ["pl-14", 12]],
    [["pl-7", 14], ["pl-12", 16]]
  ),
  "team-law-volley": volley(
    [["pl-13", 1], ["pl-8", 3], ["pl-18", 5], ["pl-8", 7], ["pl-18", 9], ["pl-8", 11]],
    [["pl-18", 2], ["pl-13", 4], ["pl-8", 6], ["pl-18", 8], ["pl-13", 10], ["pl-8", 12]],
    [["pl-18", 14], ["pl-13", 16]]
  ),
  "team-csc-tennis": tennis(
    [["pl-10", 1]],
    [["pl-1", 1], ["pl-2", 2]],
    []
  ),
  "team-mec-tennis": tennis(
    [["pl-4", 1]],
    [["pl-5", 1], ["pl-11", 2]],
    []
  ),
  "team-eee-tennis": tennis(
    [["pl-6", 1]],
    [["pl-20", 1], ["pl-34", 2]],
    []
  ),
  "team-bio-tennis": tennis(
    [["pl-7", 1]],
    [["pl-12", 1], ["pl-35", 2]],
    []
  ),
};

const DEMO_CLUB_COMPETITIONS: Record<string, ClubCompetition[]> = {
  "team-csc-fc": [
    { tournament_id: "tourn-ifl-2026", name: "Achievers League", sport_id: "sport-football", href: "/standings?sport=football" },
    { tournament_id: "tourn-cup-2026", name: "Inter-Faculty Cup", sport_id: "sport-football", href: "/competition?sport=football&competition=tourn-cup-2026" },
    { tournament_id: "tourn-deans-cup-2026", name: "Deans Cup", sport_id: "sport-football", href: "/competition?sport=football&competition=tourn-deans-cup-2026" },
  ],
  "team-mec-giants": [
    { tournament_id: "tourn-ifl-2026", name: "Achievers League", sport_id: "sport-football", href: "/standings?sport=football" },
    { tournament_id: "tourn-cup-2026", name: "Inter-Faculty Cup", sport_id: "sport-football", href: "/competition?sport=football&competition=tourn-cup-2026" },
    { tournament_id: "tourn-deans-cup-2026", name: "Deans Cup", sport_id: "sport-football", href: "/competition?sport=football&competition=tourn-deans-cup-2026" },
  ],
  "team-csc-hoops": [
    { tournament_id: "tourn-ifl-2026", name: "Campus Basketball League", sport_id: "sport-basketball", href: "/standings?sport=basketball" },
    { tournament_id: DEMO_BASKETBALL_TOURNAMENT.id, name: DEMO_BASKETBALL_TOURNAMENT.name, sport_id: "sport-basketball", href: "/competition?sport=basketball" },
  ],
  "team-med-court": [
    { tournament_id: "tourn-ifl-2026", name: "Campus Basketball League", sport_id: "sport-basketball", href: "/standings?sport=basketball" },
    { tournament_id: DEMO_BASKETBALL_TOURNAMENT.id, name: DEMO_BASKETBALL_TOURNAMENT.name, sport_id: "sport-basketball", href: "/competition?sport=basketball" },
  ],
  "team-csc-volley": [
    { tournament_id: "tourn-ifl-2026", name: "Campus Volleyball League", sport_id: "sport-volleyball", href: "/standings?sport=volleyball" },
    { tournament_id: DEMO_VOLLEYBALL_TOURNAMENT.id, name: DEMO_VOLLEYBALL_TOURNAMENT.name, sport_id: "sport-volleyball", href: "/competition?sport=volleyball" },
  ],
  "team-csc-tennis": [
    { tournament_id: DEMO_TENNIS_TOURNAMENT.id, name: DEMO_TENNIS_TOURNAMENT.name, sport_id: "sport-tennis", href: "/competition?sport=tennis" },
  ],
  "team-mec-tennis": [
    { tournament_id: DEMO_TENNIS_TOURNAMENT.id, name: DEMO_TENNIS_TOURNAMENT.name, sport_id: "sport-tennis", href: "/competition?sport=tennis" },
  ],
};

const SQUAD_GROUP_ORDER: Record<string, string[]> = {
  "sport-football": ["Starting XI", "Substitutes", "Reserves"],
  "sport-basketball": ["Starting Five", "Bench", "Reserves"],
  "sport-volleyball": ["Starting Six", "Bench", "Reserves"],
  "sport-tennis": ["Singles", "Doubles", "Reserves"],
  "sport-track": ["Sprinters", "Reserves"],
};

export function getClubCompetitions(teamId: string): ClubCompetition[] {
  return DEMO_CLUB_COMPETITIONS[teamId] ?? [];
}

export function getSquadForTeam(teamId: string, sportId: string): SquadPlayer[] {
  // Bulk-imported squads (demo overlay) take precedence over fixtures.
  const imported = getImportedSquadForTeam(teamId);
  if (imported.length) return imported.sort(sortSquad);

  const team = DEMO_TEAMS.find((t) => t.id === teamId);
  if (!team) return [];

  const roster = DEMO_SQUAD_ROSTER[teamId];
  if (roster) {
    const players: SquadPlayer[] = [];
    const seen = new Set<string>();
    for (const entry of roster) {
      if (seen.has(entry.player_id)) continue;
      seen.add(entry.player_id);
      const player = DEMO_PLAYERS.find((p) => p.id === entry.player_id);
      if (!player) continue;
      players.push({
        ...player,
        jersey_number: entry.jersey_number,
        squad_role: entry.squad_role,
      });
    }
    return players.sort(sortSquad);
  }

  return DEMO_PLAYERS.filter((p) => p.department_id === team.department_id)
    .map((p) => ({ ...p, squad_role: p.position ?? "Player" }))
    .sort(sortSquad);
}

export function getSquadRosterEntries(teamId: string): SquadPlayer[] {
  const team = DEMO_TEAMS.find((t) => t.id === teamId);
  if (!team) return [];

  const roster = DEMO_SQUAD_ROSTER[teamId];
  if (!roster) {
    return DEMO_PLAYERS.filter((p) => p.department_id === team.department_id).map((p) => ({
      ...p,
      squad_role: p.position ?? "Player",
    }));
  }

  const players: SquadPlayer[] = [];
  for (const entry of roster) {
    const player = DEMO_PLAYERS.find((p) => p.id === entry.player_id);
    if (!player) continue;
    players.push({
      ...player,
      jersey_number: entry.jersey_number,
      squad_role: entry.squad_role,
    });
  }
  return players;
}

function sortSquad(a: SquadPlayer, b: SquadPlayer) {
  const orderA = POSITION_ORDER[a.position ?? ""] ?? POSITION_ORDER[a.squad_role] ?? 5;
  const orderB = POSITION_ORDER[b.position ?? ""] ?? POSITION_ORDER[b.squad_role] ?? 5;
  if (orderA !== orderB) return orderA - orderB;
  return (a.jersey_number ?? 99) - (b.jersey_number ?? 99);
}

export function groupSquadByRole(squad: SquadPlayer[], sportId?: string): { role: string; players: SquadPlayer[] }[] {
  const order = SQUAD_GROUP_ORDER[sportId ?? "sport-football"] ?? SQUAD_GROUP_ORDER["sport-football"];
  const groups = new Map<string, SquadPlayer[]>();

  for (const p of squad) {
    const key = p.squad_role;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const result: { role: string; players: SquadPlayer[] }[] = [];
  for (const role of order) {
    const players = groups.get(role);
    if (players?.length) {
      result.push({ role, players: dedupeSquadPlayers(players) });
    }
    groups.delete(role);
  }
  for (const [role, players] of groups) {
    result.push({ role, players: dedupeSquadPlayers(players) });
  }
  return result;
}

/** Tennis: 1 singles player or doubles pair (2) per side — real-world lineup sizes */
export function getTennisLineupForMatch(
  teamId: string,
  variant: "singles" | "doubles" | "standard" | "relay" | undefined
): SquadPlayer[] {
  const isDoubles = variant === "doubles";
  const role = isDoubles ? "Doubles" : "Singles";
  const limit = isDoubles ? 2 : 1;
  const seen = new Set<string>();
  const out: SquadPlayer[] = [];

  for (const p of getSquadRosterEntries(teamId)) {
    if (p.squad_role !== role) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

function dedupeSquadPlayers(players: SquadPlayer[]): SquadPlayer[] {
  const seen = new Set<string>();
  const out: SquadPlayer[] = [];
  for (const p of players) {
    const key = `${p.id}-${p.jersey_number ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
