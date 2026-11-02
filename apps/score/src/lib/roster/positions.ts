import type { SportId } from "@/lib/utils/sport";

/** Fixed onboarding positions per sport — pick one or many. */
export const SPORT_POSITIONS: Record<SportId, readonly string[]> = {
  football: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  basketball: ["Guard", "Forward", "Center"],
  volleyball: ["Setter", "Libero", "Outside Hitter", "Opposite", "Middle Blocker"],
  tennis: ["Singles", "Doubles"],
  track: ["Sprinter", "Hurdler", "Jumper", "Thrower", "Distance", "Middle Distance", "Relay"],
} as const;

const ALIASES: Record<string, string> = {
  gk: "Goalkeeper",
  goalkeeper: "Goalkeeper",
  keeper: "Goalkeeper",
  def: "Defender",
  defender: "Defender",
  cb: "Defender",
  lb: "Defender",
  rb: "Defender",
  "centre back": "Defender",
  "center back": "Defender",
  "full back": "Defender",
  "wing back": "Defender",
  mid: "Midfielder",
  midfielder: "Midfielder",
  cm: "Midfielder",
  cdm: "Midfielder",
  cam: "Midfielder",
  dm: "Midfielder",
  am: "Midfielder",
  fw: "Forward",
  forward: "Forward",
  st: "Forward",
  cf: "Forward",
  striker: "Forward",
  attacker: "Forward",
  winger: "Forward",
  lw: "Forward",
  rw: "Forward",
  guard: "Guard",
  pg: "Guard",
  sg: "Guard",
  "point guard": "Guard",
  "shooting guard": "Guard",
  sf: "Forward",
  pf: "Forward",
  "small forward": "Forward",
  "power forward": "Forward",
  c: "Center",
  center: "Center",
  centre: "Center",
  setter: "Setter",
  libero: "Libero",
  "outside hitter": "Outside Hitter",
  opposite: "Opposite",
  "opposite hitter": "Opposite",
  "middle blocker": "Middle Blocker",
  singles: "Singles",
  doubles: "Doubles",
  sprinter: "Sprinter",
  hurdler: "Hurdler",
  jumper: "Jumper",
  thrower: "Thrower",
  distance: "Distance",
  "middle distance": "Middle Distance",
  relay: "Relay",
};

const ALL_CANONICAL = new Set(Object.values(SPORT_POSITIONS).flat());

/** Resolve one token to a canonical position label, or null. */
export function normalisePositionToken(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  if (ALIASES[key]) return ALIASES[key];
  for (const label of ALL_CANONICAL) {
    if (label.toLowerCase() === key) return label;
  }
  return null;
}

/**
 * Parse a position field that may list several roles:
 * "GK/Forward", "Forward + Midfielder", "Setter, Libero"
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

export function formatPositions(positions: string[]): string | null {
  const cleaned = positions.map((p) => p.trim()).filter(Boolean);
  if (!cleaned.length) return null;
  return cleaned.join(", ");
}

/** Primary role for squad_role column (short). */
export function primaryPosition(positions: string[] | string | null | undefined): string | null {
  if (!positions) return null;
  const list = Array.isArray(positions) ? positions : parsePositionsField(positions);
  return list[0] ?? null;
}
