import { parseFormation } from "@/lib/match/formation-layout";
import { parsePositionsField } from "@/lib/roster/positions";

export const DEFAULT_FORMATION = "4-3-3";

/** Formations a team can pick in the squad desk. Each must fit 11 starters (GK + 10). */
export const FOOTBALL_FORMATIONS = [
  "4-3-3",
  "4-4-2",
  "4-2-3-1",
  "4-1-4-1",
  "4-5-1",
  "3-5-2",
  "3-4-3",
  "5-3-2",
] as const;

export type AvailabilityStatus = "available" | "doubtful" | "injured" | "unavailable";

export function normaliseAvailability(raw: string | null | undefined): AvailabilityStatus {
  return raw === "doubtful" || raw === "injured" || raw === "unavailable" ? raw : "available";
}

export type PosGroup = "GK" | "DEF" | "MID" | "FWD" | "OTHER";

const GROUP_BY_ABBR: Record<string, PosGroup> = {
  GK: "GK",
  LB: "DEF",
  CB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LM: "MID",
  RM: "MID",
  LW: "FWD",
  RW: "FWD",
  CF: "FWD",
  ST: "FWD",
};

/** Football position group from a stored position string such as "GK" or "CB, CDM". */
export function positionGroup(position: string | null | undefined): PosGroup {
  const first = parsePositionsField(position ?? "")[0];
  if (!first) return "OTHER";
  return GROUP_BY_ABBR[first] ?? "OTHER";
}

export interface SheetEntry {
  player_id: string;
  is_starting: boolean;
  role?: string | null;
  is_captain?: boolean;
  jersey_number?: number | null;
}

export interface PoolPlayer {
  player_id: string;
  position: string | null;
  jersey_number: number | null;
  /** False for injured, doubtful or suspended players. They are not auto-picked as starters. */
  available: boolean;
}

export interface CompletedXi {
  players: SheetEntry[];
  /** Player ids the system added to the XI (the rest of the sheet is as submitted). */
  autoFilledIds: string[];
  /** True when the XI now has the full number of starters. */
  complete: boolean;
}

/**
 * Group targets for a formation such as "4-3-3" when it fits the starter count
 * (GK + outfield lines). Returns null when the formation does not fit (e.g. basketball).
 */
export function formationTargets(
  formation: string,
  starters: number
): Record<PosGroup, number> | null {
  const lines = parseFormation(formation);
  if (lines.length < 2) return null;
  const outfield = lines.reduce((sum, n) => sum + n, 0);
  if (starters !== outfield + 1) return null;
  const middle = lines.slice(1, -1).reduce((sum, n) => sum + n, 0);
  return {
    GK: 1,
    DEF: lines[0],
    MID: middle,
    FWD: lines[lines.length - 1],
    OTHER: 0,
  };
}

function byJersey(a: PoolPlayer, b: PoolPlayer): number {
  const ja = a.jersey_number ?? 999;
  const jb = b.jersey_number ?? 999;
  if (ja !== jb) return ja - jb;
  return a.player_id.localeCompare(b.player_id);
}

const GROUP_ORDER: PosGroup[] = ["GK", "DEF", "MID", "FWD"];

/**
 * Keep whatever starters were submitted (pinned) and fill the remaining XI spots from the
 * squad pool, picking by position group to match the formation. Everyone not in the XI
 * goes to the bench, so the sheet always has a full XI and a bench.
 */
export function completeStartingXi(input: {
  sheet: SheetEntry[];
  pool: PoolPlayer[];
  starters: number;
  formation: string;
}): CompletedXi {
  const { sheet, pool, starters, formation } = input;
  const pinned = sheet.filter((s) => s.is_starting);
  if (pinned.length >= starters) {
    return { players: sheet, autoFilledIds: [], complete: true };
  }

  const poolById = new Map(pool.map((p) => [p.player_id, p]));
  const inSheet = new Set(sheet.map((s) => s.player_id));
  const need = starters - pinned.length;

  const pinnedCounts: Record<PosGroup, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0, OTHER: 0 };
  for (const s of pinned) {
    const position = s.role ?? poolById.get(s.player_id)?.position ?? null;
    pinnedCounts[positionGroup(position)] += 1;
  }

  const candidates = pool
    .filter((p) => p.available && !inSheet.has(p.player_id))
    .sort(byJersey);
  const picked: PoolPlayer[] = [];
  const used = new Set<string>();
  const take = (p: PoolPlayer) => {
    picked.push(p);
    used.add(p.player_id);
  };

  const targets = formationTargets(formation, starters);
  if (targets) {
    const remaining = { ...targets };
    for (const g of GROUP_ORDER) {
      remaining[g] = Math.max(0, targets[g] - pinnedCounts[g]);
    }
    for (const g of GROUP_ORDER) {
      for (const p of candidates) {
        if (picked.length >= need) break;
        if (used.has(p.player_id)) continue;
        if (positionGroup(p.position) === g && remaining[g] > 0) {
          take(p);
          remaining[g] -= 1;
        }
      }
    }
  }
  for (const p of candidates) {
    if (picked.length >= need) break;
    if (!used.has(p.player_id)) take(p);
  }

  const xi: SheetEntry[] = [
    ...pinned,
    ...picked.map((p) => ({
      player_id: p.player_id,
      is_starting: true,
      role: p.position,
      jersey_number: p.jersey_number,
    })),
  ];
  const xiIds = new Set(xi.map((s) => s.player_id));
  const benchFromSheet = sheet.filter((s) => !s.is_starting);
  const benchIds = new Set(benchFromSheet.map((s) => s.player_id));
  const benchFromPool: SheetEntry[] = pool
    .filter((p) => !xiIds.has(p.player_id) && !benchIds.has(p.player_id))
    .map((p) => ({
      player_id: p.player_id,
      is_starting: false,
      role: p.position,
      jersey_number: p.jersey_number,
    }));

  const xiCount = xi.filter((s) => s.is_starting).length;
  return {
    players: [...xi, ...benchFromSheet, ...benchFromPool],
    autoFilledIds: picked.map((p) => p.player_id),
    complete: xiCount >= starters,
  };
}
