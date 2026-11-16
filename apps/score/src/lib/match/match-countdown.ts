/** Negative countdown window before kickoff (plan: last 5 minutes). */
export const KICKOFF_NEGATIVE_COUNTDOWN_MS = 5 * 60 * 1000;

/** @deprecated Use KICKOFF_NEGATIVE_COUNTDOWN_MS — kept for any leftover imports */
export const KICKOFF_COUNTDOWN_MS = KICKOFF_NEGATIVE_COUNTDOWN_MS;

export type KickoffPhase = "far" | "countdown" | "awaiting";

export interface KickoffCountdownState {
  phase: KickoffPhase;
  scheduledAt: string;
  /** Milliseconds until kickoff (negative once past). */
  msUntil: number;
}

const WAT = "Africa/Lagos";

export function getKickoffCountdown(
  scheduledAt: string | null | undefined,
  now = Date.now()
): KickoffCountdownState | null {
  if (!scheduledAt) return null;
  const kickoff = new Date(scheduledAt).getTime();
  if (Number.isNaN(kickoff)) return null;

  const msUntil = kickoff - now;
  if (msUntil > KICKOFF_NEGATIVE_COUNTDOWN_MS) {
    return { phase: "far", scheduledAt, msUntil };
  }
  if (msUntil > 0) {
    return { phase: "countdown", scheduledAt, msUntil };
  }
  return { phase: "awaiting", scheduledAt, msUntil: 0 };
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Negative pre-kickoff clock: -5:00 … -0:01 */
export function formatNegativeCountdown(msUntil: number): string {
  const totalSec = Math.max(0, Math.ceil(msUntil / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `-${m}:${s.toString().padStart(2, "0")}`;
}

export function formatKickoffTime(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: WAT,
  });
}

/** 24-hour kickoff in WAT (Africa/Lagos), e.g. 16:00 */
export function formatKickoffTime24(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: WAT,
  });
}

/** Public pre-match pill: "Kick-off 16:00" */
export function formatKickoffLabel(scheduledAt: string): string {
  return `Kick-off ${formatKickoffTime24(scheduledAt)}`;
}
