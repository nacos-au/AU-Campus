import type { LineupSheetStatus } from "@/lib/types/database";

/** Minutes before kickoff when predicted XI locks and confirmed becomes the source. */
export const LINEUP_CONFIRM_WINDOW_MINUTES = 60;

export function minutesUntilKickoff(scheduledAt: string | null | undefined, now = Date.now()): number | null {
  if (!scheduledAt) return null;
  const kick = new Date(scheduledAt).getTime();
  if (Number.isNaN(kick)) return null;
  return (kick - now) / 60_000;
}

/** True when kickoff is more than 60 minutes away (predicted sheet window). */
export function isPredictedLineupWindow(scheduledAt: string | null | undefined, now = Date.now()): boolean {
  const mins = minutesUntilKickoff(scheduledAt, now);
  return mins == null ? true : mins > LINEUP_CONFIRM_WINDOW_MINUTES;
}

/**
 * Default sheet status when staff submit an XI.
 * Before T−60 → predicted; at/after T−60 → confirmed.
 */
export function defaultLineupStatusForKickoff(
  scheduledAt: string | null | undefined,
  requested?: LineupSheetStatus | null,
  now = Date.now()
): LineupSheetStatus {
  if (requested === "predicted" || requested === "confirmed") {
    if (requested === "predicted" && !isPredictedLineupWindow(scheduledAt, now)) {
      return "confirmed";
    }
    return requested;
  }
  return isPredictedLineupWindow(scheduledAt, now) ? "predicted" : "confirmed";
}

export function lineupStatusLabel(status: LineupSheetStatus | null | undefined): string {
  return status === "confirmed" ? "Confirmed XI" : "Predicted XI";
}
