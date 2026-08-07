"use client";

import { useCallback, useEffect, useState } from "react";

export interface MatchClockState {
  elapsedSeconds: number;
  isRunning: boolean;
  isTimeLost: boolean;
  period: string;
  /** Wall-clock start of the current run (survives tab sleep / screen-off). */
  runningStartedAt: number | null;
}

const DEFAULT: MatchClockState = {
  elapsedSeconds: 0,
  isRunning: false,
  isTimeLost: false,
  period: "half_1",
  runningStartedAt: null,
};

function storageKey(matchId: string) {
  return `au-score-clock-${matchId}`;
}

/** Elapsed seconds including wall time while the clock has been running. */
export function liveElapsedSeconds(state: MatchClockState): number {
  if (!state.isRunning || state.isTimeLost || state.runningStartedAt == null) {
    return state.elapsedSeconds;
  }
  const extra = Math.max(0, Math.floor((Date.now() - state.runningStartedAt) / 1000));
  return state.elapsedSeconds + extra;
}

function normalizeStored(raw: unknown): MatchClockState {
  const s = raw as Partial<MatchClockState>;
  return {
    elapsedSeconds: typeof s.elapsedSeconds === "number" ? s.elapsedSeconds : 0,
    isRunning: Boolean(s.isRunning),
    isTimeLost: Boolean(s.isTimeLost),
    period: typeof s.period === "string" ? s.period : "half_1",
    runningStartedAt:
      typeof s.runningStartedAt === "number"
        ? s.runningStartedAt
        : s.isRunning && !s.isTimeLost
          ? Date.now()
          : null,
  };
}

function freezeRunning(state: MatchClockState): MatchClockState {
  if (!state.isRunning || state.runningStartedAt == null) {
    return { ...state, isRunning: false, runningStartedAt: null };
  }
  return {
    ...state,
    elapsedSeconds: liveElapsedSeconds(state),
    isRunning: false,
    runningStartedAt: null,
  };
}

export function useMatchClock(matchId: string, initial?: Partial<MatchClockState>) {
  const [clock, setClock] = useState<MatchClockState>(() => {
    if (typeof window === "undefined") return { ...DEFAULT, ...initial, runningStartedAt: null };
    try {
      const raw = localStorage.getItem(storageKey(matchId));
      if (raw) return normalizeStored(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    return { ...DEFAULT, ...initial, runningStartedAt: null };
  });
  const [, setTick] = useState(0);

  const persist = useCallback(
    (next: MatchClockState) => {
      setClock(next);
      try {
        localStorage.setItem(storageKey(matchId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [matchId]
  );

  const flushWallClock = useCallback(() => {
    setClock((prev) => {
      if (!prev.isRunning || prev.isTimeLost || prev.runningStartedAt == null) return prev;
      const next: MatchClockState = {
        ...prev,
        elapsedSeconds: liveElapsedSeconds(prev),
        runningStartedAt: Date.now(),
      };
      try {
        localStorage.setItem(storageKey(matchId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [matchId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(matchId) && e.newValue) {
        setClock(normalizeStored(JSON.parse(e.newValue)));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [matchId]);

  useEffect(() => {
    if (!clock.isRunning || clock.isTimeLost) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [clock.isRunning, clock.isTimeLost]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushWallClock();
    };
    const onPageHide = () => flushWallClock();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flushWallClock]);

  const display = { ...clock, elapsedSeconds: liveElapsedSeconds(clock) };

  const setRunning = (isRunning: boolean) => {
    if (isRunning) {
      persist({
        ...clock,
        elapsedSeconds: liveElapsedSeconds(clock),
        isRunning: true,
        isTimeLost: false,
        runningStartedAt: Date.now(),
      });
      return;
    }
    persist(freezeRunning(clock));
  };

  const setTimeLost = (isTimeLost: boolean) => {
    if (isTimeLost) {
      persist({
        ...freezeRunning(clock),
        isTimeLost: true,
        isRunning: false,
      });
      return;
    }
    persist({
      ...clock,
      isTimeLost: false,
      isRunning: true,
      runningStartedAt: Date.now(),
    });
  };

  const resetClock = (period?: string) =>
    persist({
      elapsedSeconds: 0,
      isRunning: false,
      isTimeLost: false,
      period: period ?? clock.period,
      runningStartedAt: null,
    });

  const stopClock = () => persist(freezeRunning(clock));

  const formatTime = () => {
    const total = display.elapsedSeconds;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const elapsedMinutes = Math.floor(display.elapsedSeconds / 60);

  return {
    clock: display,
    setRunning,
    setTimeLost,
    resetClock,
    stopClock,
    persist,
    formatTime,
    elapsedMinutes,
  };
}
