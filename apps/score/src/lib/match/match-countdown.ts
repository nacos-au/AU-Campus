/** Show live countdown within one hour of scheduled kickoff */
export const KICKOFF_COUNTDOWN_MS = 60 * 60 * 1000;

export type KickoffPhase = "far" | "countdown" | "awaiting";

export interface KickoffCountdownState {
  phase: KickoffPhase;
  scheduledAt: string;
  msUntil: number;
}

export function getKickoffCountdown(
  scheduledAt: string | null | undefined,
  now = Date.now()
): KickoffCountdownState | null {
  if (!scheduledAt) return null;
  const kickoff = new Date(scheduledAt).getTime();
  if (Number.isNaN(kickoff)) return null;

  const msUntil = kickoff - now;
  if (msUntil > KICKOFF_COUNTDOWN_MS) {
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

export function formatKickoffTime(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 24-hour kickoff label e.g. 19:00 */
export function formatKickoffTime24(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
