import type { Match } from "@/lib/types/database";
import type { SubmittedLineup } from "@/lib/data/demo-lineups";

/**
 * Clean sheets are a POST-MATCH stat — never tallied live. They're computed
 * from the final score, the submitted lineup, and substitution events, which
 * is why lineups matter: without a submitted lineup we can't know which
 * goalkeeper(s) played, so no clean sheet is credited.
 *
 * Two-goalkeeper rule (real-world convention): a goalkeeper is credited with
 * a clean sheet only if no goal was conceded while they were on the pitch.
 * If the team concedes 0 overall, every GK who played gets one. If goals were
 * conceded, we use substitution minutes to attribute them to a stint.
 */

export interface GoalkeeperStint {
  player_id: string;
  /** Minute the GK came on (0 for starters) */
  from_minute: number;
  /** Minute the GK went off (match end if not subbed) */
  to_minute: number;
}

export interface CleanSheetResult {
  player_id: string;
  clean_sheet: boolean;
  goals_conceded_during_stint: number;
}

export interface SubstitutionEvent {
  minute: number;
  player_in_id: string | null;
  player_out_id: string | null;
}

export interface ConcededGoal {
  minute: number;
}

/** Build GK stints from the submitted lineup + substitution events. */
export function buildGoalkeeperStints(
  lineup: SubmittedLineup,
  substitutions: SubstitutionEvent[],
  matchLengthMinutes = 90
): GoalkeeperStint[] {
  const gkIds = new Set(
    lineup.players.filter((p) => (p.role ?? "").toUpperCase() === "GK").map((p) => p.player_id)
  );
  if (gkIds.size === 0) return [];

  const stints: GoalkeeperStint[] = [];
  const startingGk = lineup.players.find(
    (p) => p.is_starting && gkIds.has(p.player_id)
  );
  if (startingGk) {
    stints.push({ player_id: startingGk.player_id, from_minute: 0, to_minute: matchLengthMinutes });
  }

  for (const sub of substitutions) {
    // GK going off closes their stint
    if (sub.player_out_id && gkIds.has(sub.player_out_id)) {
      const open = stints.find((s) => s.player_id === sub.player_out_id && s.to_minute === matchLengthMinutes);
      if (open) open.to_minute = sub.minute;
    }
    // GK coming on opens a new stint
    if (sub.player_in_id && gkIds.has(sub.player_in_id)) {
      stints.push({ player_id: sub.player_in_id, from_minute: sub.minute, to_minute: matchLengthMinutes });
    }
  }

  return stints;
}

/** Credit clean sheets per goalkeeper stint. Only valid on completed matches. */
export function computeCleanSheets(
  match: Pick<Match, "status">,
  stints: GoalkeeperStint[],
  goalsConceded: ConcededGoal[]
): CleanSheetResult[] {
  if (match.status !== "completed") return [];

  return stints.map((stint) => {
    const conceded = goalsConceded.filter(
      (g) => g.minute >= stint.from_minute && g.minute <= stint.to_minute
    ).length;
    return {
      player_id: stint.player_id,
      clean_sheet: conceded === 0,
      goals_conceded_during_stint: conceded,
    };
  });
}
