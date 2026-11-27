import type { SquadPlayer } from "@/lib/data/demo-squads";

export function isStarterRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return (
    r.includes("start") ||
    r.includes("xi") ||
    r === "gk" ||
    r === "df" ||
    r === "mf" ||
    r === "fw"
  );
}

export function isBenchRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes("sub") || r.includes("bench") || r.includes("reserve");
}

export function sortSquad(players: SquadPlayer[]): SquadPlayer[] {
  return [...players].sort((a, b) => {
    const ja = a.jersey_number ?? 999;
    const jb = b.jersey_number ?? 999;
    if (ja !== jb) return ja - jb;
    return a.last_name.localeCompare(b.last_name);
  });
}

export interface SubPair {
  outId: string;
  inId: string;
}

export interface SquadSplit {
  /** On the pitch right now. */
  xi: SquadPlayer[];
  /** Available to come on (never played, or never subbed off). */
  bench: SquadPlayer[];
  /** Already substituted off — cannot return. */
  subbedOff: SquadPlayer[];
}

/**
 * Splits a squad into XI / bench from roster roles, then replays the match's
 * substitutions so the XI always reflects who is on the pitch.
 */
export function splitSquad(players: SquadPlayer[], subs: SubPair[] = []): SquadSplit {
  const sorted = sortSquad(players);
  const hasRoles = sorted.some((p) => isStarterRole(p.squad_role) || isBenchRole(p.squad_role));

  let xi = hasRoles
    ? sorted.filter((p) => isStarterRole(p.squad_role) || !isBenchRole(p.squad_role))
    : sorted.slice(0, Math.min(11, sorted.length));
  let bench = hasRoles ? sorted.filter((p) => isBenchRole(p.squad_role)) : sorted.slice(11);

  // Roles that produced no bench: fall back to a jersey split so sub-in has options.
  if (!bench.length && !hasRoles) {
    xi = sorted.slice(0, 11);
    bench = sorted.slice(11);
  }

  const subbedOff: SquadPlayer[] = [];
  for (const sub of subs) {
    const outIdx = xi.findIndex((p) => p.id === sub.outId);
    const inIdx = bench.findIndex((p) => p.id === sub.inId);
    if (outIdx < 0 || inIdx < 0) continue;
    const [out] = xi.splice(outIdx, 1);
    const [incoming] = bench.splice(inIdx, 1);
    subbedOff.push(out);
    xi.push(incoming);
  }

  return { xi: sortSquad(xi), bench, subbedOff };
}

/** Substitution pairs for one team from keeper logs. */
export function subPairsFromLogs(
  logs: Array<{ event_type: string; team_id: string; details?: Record<string, unknown> | null }>,
  teamId: string
): SubPair[] {
  const pairs: SubPair[] = [];
  for (const l of logs) {
    if (l.event_type !== "substitution" || l.team_id !== teamId) continue;
    const outId = l.details?.player_out_id;
    const inId = l.details?.player_in_id;
    if (typeof outId === "string" && typeof inId === "string") pairs.push({ outId, inId });
  }
  return pairs;
}
