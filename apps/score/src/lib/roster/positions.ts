import type { SportId } from "@/lib/utils/sport";

export interface PositionDef {
  /** SofaScore-style short code stored on the player / paste lists. */
  abbr: string;
  /** Full name for UI tooltips and future display. */
  name: string;
}

/**
 * Fixed positions per sport — abbreviations are canonical; names are metadata.
 * Ordered roughly back-to-front / SofaScore lineup order where it applies.
 */
export const SPORT_POSITION_DEFS: Record<SportId, readonly PositionDef[]> = {
  football: [
    { abbr: "GK", name: "Goalkeeper" },
    { abbr: "LB", name: "Left Back" },
    { abbr: "CB", name: "Centre Back" },
    { abbr: "RB", name: "Right Back" },
    { abbr: "LWB", name: "Left Wing Back" },
    { abbr: "RWB", name: "Right Wing Back" },
    { abbr: "CDM", name: "Defensive Midfielder" },
    { abbr: "CM", name: "Central Midfielder" },
    { abbr: "CAM", name: "Attacking Midfielder" },
    { abbr: "LM", name: "Left Midfielder" },
    { abbr: "RM", name: "Right Midfielder" },
    { abbr: "LW", name: "Left Winger" },
    { abbr: "RW", name: "Right Winger" },
    { abbr: "CF", name: "Centre Forward" },
    { abbr: "ST", name: "Striker" },
  ],
  basketball: [
    { abbr: "PG", name: "Point Guard" },
    { abbr: "SG", name: "Shooting Guard" },
    { abbr: "SF", name: "Small Forward" },
    { abbr: "PF", name: "Power Forward" },
    { abbr: "C", name: "Center" },
  ],
  volleyball: [
    { abbr: "S", name: "Setter" },
    { abbr: "L", name: "Libero" },
    { abbr: "OH", name: "Outside Hitter" },
    { abbr: "OPP", name: "Opposite" },
    { abbr: "MB", name: "Middle Blocker" },
  ],
  tennis: [
    { abbr: "SGL", name: "Singles" },
    { abbr: "DBL", name: "Doubles" },
  ],
  track: [
    { abbr: "SPR", name: "Sprinter" },
    { abbr: "HUD", name: "Hurdler" },
    { abbr: "JMP", name: "Jumper" },
    { abbr: "THR", name: "Thrower" },
    { abbr: "DIS", name: "Distance" },
    { abbr: "MD", name: "Middle Distance" },
    { abbr: "REL", name: "Relay" },
  ],
} as const;

/** @deprecated Prefer SPORT_POSITION_DEFS — abbr list for quick maps. */
export const SPORT_POSITIONS: Record<SportId, readonly string[]> = {
  football: SPORT_POSITION_DEFS.football.map((p) => p.abbr),
  basketball: SPORT_POSITION_DEFS.basketball.map((p) => p.abbr),
  volleyball: SPORT_POSITION_DEFS.volleyball.map((p) => p.abbr),
  tennis: SPORT_POSITION_DEFS.tennis.map((p) => p.abbr),
  track: SPORT_POSITION_DEFS.track.map((p) => p.abbr),
};

const BY_ABBR = new Map<string, PositionDef>();
const BY_NAME = new Map<string, PositionDef>();

for (const defs of Object.values(SPORT_POSITION_DEFS)) {
  for (const def of defs) {
    BY_ABBR.set(def.abbr.toUpperCase(), def);
    BY_NAME.set(def.name.toLowerCase(), def);
  }
}

/** Extra paste aliases → canonical abbr. */
const ALIAS_TO_ABBR: Record<string, string> = {
  goalkeeper: "GK",
  keeper: "GK",
  "left back": "LB",
  "right back": "RB",
  "centre back": "CB",
  "center back": "CB",
  defender: "CB",
  def: "CB",
  "full back": "LB",
  "wing back": "LWB",
  "left wing back": "LWB",
  "right wing back": "RWB",
  "defensive midfielder": "CDM",
  "central midfielder": "CM",
  "attacking midfielder": "CAM",
  midfielder: "CM",
  mid: "CM",
  dm: "CDM",
  am: "CAM",
  "left midfielder": "LM",
  "right midfielder": "RM",
  "left winger": "LW",
  "right winger": "RW",
  winger: "LW",
  "centre forward": "CF",
  "center forward": "CF",
  forward: "ST",
  fw: "ST",
  striker: "ST",
  attacker: "ST",
  "point guard": "PG",
  "shooting guard": "SG",
  "small forward": "SF",
  "power forward": "PF",
  guard: "PG",
  center: "C",
  centre: "C",
  setter: "S",
  libero: "L",
  "outside hitter": "OH",
  opposite: "OPP",
  "opposite hitter": "OPP",
  "middle blocker": "MB",
  singles: "SGL",
  doubles: "DBL",
  sprinter: "SPR",
  hurdler: "HUD",
  jumper: "JMP",
  thrower: "THR",
  distance: "DIS",
  "middle distance": "MD",
  relay: "REL",
};

export function positionLabel(abbr: string): string {
  const def = BY_ABBR.get(abbr.trim().toUpperCase());
  return def ? `${def.abbr} — ${def.name}` : abbr;
}

export function positionName(abbr: string): string | null {
  return BY_ABBR.get(abbr.trim().toUpperCase())?.name ?? null;
}

/** Resolve one token to a canonical abbreviation, or null. */
export function normalisePositionToken(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  const upper = raw.trim().toUpperCase();
  if (BY_ABBR.has(upper)) return BY_ABBR.get(upper)!.abbr;
  if (ALIAS_TO_ABBR[key]) return ALIAS_TO_ABBR[key];
  if (BY_NAME.has(key)) return BY_NAME.get(key)!.abbr;
  return null;
}

/**
 * Parse a position field that may list several roles:
 * "GK/ST", "CAM + LW", "S, L"
 */
export function parsePositionsField(raw: string): string[] {
  const parts = raw
    .split(/\s*(?:\/|\+|&|,|;|\||\band\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const n = normalisePositionToken(part);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Persist as comma-separated abbreviations, e.g. "GK, CB". */
export function formatPositions(positions: string[]): string | null {
  const cleaned = positions
    .map((p) => normalisePositionToken(p) ?? p.trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(cleaned)];
  if (!unique.length) return null;
  return unique.join(", ");
}

/** Primary role for squad_role column (abbreviation). */
export function primaryPosition(positions: string[] | string | null | undefined): string | null {
  if (!positions) return null;
  const list = Array.isArray(positions) ? positions : parsePositionsField(positions);
  const first = list[0];
  if (!first) return null;
  return normalisePositionToken(first) ?? first;
}

export function formatPositionsDisplay(positions: string[] | string | null | undefined): string {
  if (!positions) return "";
  const list = Array.isArray(positions) ? positions : parsePositionsField(String(positions));
  return list.map((a) => positionLabel(a)).join(" · ");
}
