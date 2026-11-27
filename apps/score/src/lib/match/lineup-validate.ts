import {
  formationTargets,
  type AvailabilityStatus,
  type SheetEntry,
} from "@/lib/match/lineup-merge";

export type { AvailabilityStatus };

export interface LineupValidationInput {
  players: SheetEntry[];
  /** Exact number of starters the sport needs (football 11, basketball 5, volleyball 6). */
  starters: number;
  formation?: string | null;
  /** Competition squad ids. Null when the competition has no roster yet. */
  squadIds: Set<string> | null;
  suspendedIds: Set<string>;
  availability: Map<string, AvailabilityStatus>;
  /**
   * "rep" submissions are strict: unavailable players are errors.
   * "staff" submissions can proceed past warnings.
   */
  mode: "rep" | "staff";
  /**
   * Football admin rule: only the starting XI is needed before kickoff. Subs come
   * from the competition roster during the match. Set true (tournament config
   * `require_named_bench`) to go back to a named bench.
   */
  requireBench?: boolean;
}

/** Tournament config flag that restores the named-bench rule. */
export function requiresNamedBench(config: Record<string, unknown> | null | undefined): boolean {
  return config?.require_named_bench === true;
}

export interface LineupValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * Single gate for every lineup write path (staff API, rep link, reconcile prompt).
 */
export function validateLineupSheet(input: LineupValidationInput): LineupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { players, starters, formation, squadIds, suspendedIds, availability, mode } = input;
  const requireBench = input.requireBench === true;

  const startersList = players.filter((p) => p.is_starting);
  const bench = players.filter((p) => !p.is_starting);

  if (startersList.length !== starters) {
    errors.push(`Name exactly ${starters} starters (got ${startersList.length}).`);
  }
  if (requireBench && bench.length < 1) {
    errors.push("Name at least one substitute on the bench.");
  }

  const seen = new Set<string>();
  for (const p of players) {
    if (seen.has(p.player_id)) {
      errors.push("A player is listed more than once.");
      break;
    }
    seen.add(p.player_id);
  }

  if (squadIds) {
    const outsiders = players.filter((p) => !squadIds.has(p.player_id));
    if (outsiders.length) {
      errors.push(`${outsiders.length} player(s) are not on the competition squad.`);
    }
  }

  const captains = players.filter((p) => p.is_captain);
  if (captains.length !== 1) {
    errors.push(
      captains.length === 0
        ? "Choose one captain from the starting XI."
        : "Only one captain can be named."
    );
  } else if (!captains[0].is_starting) {
    errors.push("The captain must be in the starting XI.");
  }

  if (formation && starters === 11 && formationTargets(formation, starters) === null) {
    errors.push(`Formation ${formation} does not fit 11 starters.`);
  }

  for (const p of players) {
    if (suspendedIds.has(p.player_id)) {
      errors.push("A suspended player cannot be named.");
      break;
    }
  }

  for (const p of players) {
    const status = availability.get(p.player_id) ?? "available";
    if (status === "available") continue;
    if (mode === "rep") {
      errors.push(`A named player is ${status}. Remove them or contact the admin.`);
    } else {
      warnings.push(`A named player is ${status}.`);
    }
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
