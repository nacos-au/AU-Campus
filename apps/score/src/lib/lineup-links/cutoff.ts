/** Default cut-off: teams can submit until 60 minutes before kickoff. */
export const DEFAULT_LINEUP_CUTOFF_MINUTES = 60;
export const MAX_LINEUP_CUTOFF_MINUTES = 1440;

export function clampCutoffMinutes(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const whole = Math.round(n);
  if (whole < 0 || whole > MAX_LINEUP_CUTOFF_MINUTES) return null;
  return whole;
}

/**
 * Link override first, then the competition default, then 60 minutes.
 * A link with no override follows the competition default.
 */
export function effectiveCutoffMinutes(
  linkOverride: number | null | undefined,
  competitionDefault: number | null | undefined
): number {
  if (typeof linkOverride === "number" && Number.isFinite(linkOverride)) return linkOverride;
  if (typeof competitionDefault === "number" && Number.isFinite(competitionDefault)) {
    return competitionDefault;
  }
  return DEFAULT_LINEUP_CUTOFF_MINUTES;
}

export function cutoffAt(kickoffIso: string, cutoffMinutes: number): Date {
  return new Date(new Date(kickoffIso).getTime() - cutoffMinutes * 60_000);
}

export function isSubmissionClosed(kickoffIso: string, cutoffMinutes: number, now = new Date()): boolean {
  return now.getTime() >= cutoffAt(kickoffIso, cutoffMinutes).getTime();
}

/** "1 hour", "45 minutes", "2 hours 30 minutes" for the rep page. */
export function describeCutoff(minutes: number): string {
  if (minutes <= 0) return "at kickoff";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  return `${parts.join(" ")} before kickoff`;
}
