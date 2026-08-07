"use client";

/**
 * Wall-clock–based Phantom match timer so brief screen-off / tab sleep
 * does not lose elapsed time while the clock is meant to be running.
 */

export interface PhantomClockState {
  baseElapsed: number;
  runningStartedAt: number | null;
  clockOn: boolean;
}

function storageKey(sessionId: string) {
  return `au-score-phantom-clock-${sessionId}`;
}

export function readPhantomClock(sessionId: string): PhantomClockState {
  if (typeof window === "undefined") {
    return { baseElapsed: 0, runningStartedAt: null, clockOn: false };
  }
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return { baseElapsed: 0, runningStartedAt: null, clockOn: false };
    const parsed = JSON.parse(raw) as Partial<PhantomClockState>;
    return {
      baseElapsed: typeof parsed.baseElapsed === "number" ? parsed.baseElapsed : 0,
      runningStartedAt:
        typeof parsed.runningStartedAt === "number" ? parsed.runningStartedAt : null,
      clockOn: Boolean(parsed.clockOn),
    };
  } catch {
    return { baseElapsed: 0, runningStartedAt: null, clockOn: false };
  }
}

export function writePhantomClock(sessionId: string, state: PhantomClockState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(sessionId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function livePhantomElapsed(state: PhantomClockState): number {
  if (!state.clockOn || state.runningStartedAt == null) return state.baseElapsed;
  return (
    state.baseElapsed + Math.max(0, Math.floor((Date.now() - state.runningStartedAt) / 1000))
  );
}

export function startPhantomClock(state: PhantomClockState): PhantomClockState {
  if (state.clockOn && state.runningStartedAt != null) return state;
  return {
    baseElapsed: livePhantomElapsed(state),
    runningStartedAt: Date.now(),
    clockOn: true,
  };
}

export function pausePhantomClock(state: PhantomClockState): PhantomClockState {
  return {
    baseElapsed: livePhantomElapsed(state),
    runningStartedAt: null,
    clockOn: false,
  };
}

export function resetPhantomClock(): PhantomClockState {
  return { baseElapsed: 0, runningStartedAt: null, clockOn: false };
}

export function flushPhantomClock(state: PhantomClockState): PhantomClockState {
  if (!state.clockOn || state.runningStartedAt == null) return state;
  return {
    baseElapsed: livePhantomElapsed(state),
    runningStartedAt: Date.now(),
    clockOn: true,
  };
}
