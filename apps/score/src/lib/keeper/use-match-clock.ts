"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export function normalizeStored(raw: unknown): MatchClockState {
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

export function clockFromServer(row: {
  clock_elapsed_seconds?: number | null;
  clock_is_running?: boolean | null;
  clock_is_time_lost?: boolean | null;
  clock_running_started_at?: string | null;
  current_period?: string | null;
}): MatchClockState {
  const running = Boolean(row.clock_is_running);
  const startedAt = row.clock_running_started_at
    ? new Date(row.clock_running_started_at).getTime()
    : null;
  return {
    elapsedSeconds: row.clock_elapsed_seconds ?? 0,
    isRunning: running,
    isTimeLost: Boolean(row.clock_is_time_lost),
    period: row.current_period && row.current_period !== "not_started" ? row.current_period : "half_1",
    runningStartedAt: running && !row.clock_is_time_lost ? startedAt : null,
  };
}

export function clockToServerPayload(state: MatchClockState) {
  // Publish base elapsed + run start so spectators add wall time themselves
  // (do NOT publish already-composited live seconds or they double-count).
  const running = state.isRunning && !state.isTimeLost;
  return {
    clock_elapsed_seconds: state.elapsedSeconds,
    clock_is_running: running,
    clock_is_time_lost: state.isTimeLost,
    clock_running_started_at:
      running && state.runningStartedAt != null
        ? new Date(state.runningStartedAt).toISOString()
        : null,
  };
}

/**
 * Match clock. Uses wall-clock math so elapsed advances 1s/s even if the
 * interval drifts. Optionally pushes to the server for public spectators.
 */
export function useMatchClock(
  matchId: string,
  initial?: Partial<MatchClockState>,
  opts?: {
    /** When true, ignore localStorage and only use initial/server snapshots. */
    spectator?: boolean;
    /** Push clock state to the API (keeper). */
    syncToServer?: boolean;
  }
) {
  const spectator = Boolean(opts?.spectator);
  const syncToServer = Boolean(opts?.syncToServer);
  const [clock, setClock] = useState<MatchClockState>(() => {
    if (typeof window === "undefined") return { ...DEFAULT, ...initial, runningStartedAt: null };
    if (!spectator) {
      try {
        const raw = localStorage.getItem(storageKey(matchId));
        if (raw) return normalizeStored(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    return { ...DEFAULT, ...initial, runningStartedAt: null };
  });
  const [, setTick] = useState(0);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const writeLocal = useCallback(
    (next: MatchClockState) => {
      if (spectator) return;
      try {
        localStorage.setItem(storageKey(matchId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [matchId, spectator]
  );

  const pushServer = useCallback(
    (next: MatchClockState) => {
      if (!syncToServer) return;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        void fetch(`/api/matches/${matchId}/clock`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clockToServerPayload(next)),
        }).catch(() => undefined);
      }, 250);
    },
    [matchId, syncToServer]
  );

  const persist = useCallback(
    (next: MatchClockState) => {
      setClock(next);
      writeLocal(next);
      pushServer(next);
    },
    [pushServer, writeLocal]
  );

  /** Apply a server snapshot (public poller / hydrate). */
  const applyServerClock = useCallback(
    (next: MatchClockState) => {
      setClock(next);
      writeLocal(next);
    },
    [writeLocal]
  );

  const flushWallClock = useCallback(() => {
    setClock((prev) => {
      if (!prev.isRunning || prev.isTimeLost || prev.runningStartedAt == null) return prev;
      const next: MatchClockState = {
        ...prev,
        elapsedSeconds: liveElapsedSeconds(prev),
        runningStartedAt: Date.now(),
      };
      writeLocal(next);
      pushServer(next);
      return next;
    });
  }, [pushServer, writeLocal]);

  useEffect(() => {
    if (spectator) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(matchId) && e.newValue) {
        setClock(normalizeStored(JSON.parse(e.newValue)));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [matchId, spectator]);

  // Align UI refresh to real seconds (avoids slow/fast interval drift).
  useEffect(() => {
    if (!clock.isRunning || clock.isTimeLost) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const schedule = () => {
      const delay = Math.max(50, 1000 - (Date.now() % 1000));
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setTick((t) => t + 1);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [clock.isRunning, clock.isTimeLost]);

  // Heartbeat while running so spectators stay within ~5s.
  useEffect(() => {
    if (!syncToServer || !clock.isRunning || clock.isTimeLost) return;
    const id = setInterval(() => {
      pushServer(clockRef.current);
    }, 5000);
    return () => clearInterval(id);
  }, [clock.isRunning, clock.isTimeLost, pushServer, syncToServer]);

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
      if (syncTimer.current) clearTimeout(syncTimer.current);
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

  const setPeriod = (period: string, opts?: { resetElapsed?: boolean }) => {
    if (opts?.resetElapsed) {
      persist({
        elapsedSeconds: 0,
        isRunning: false,
        isTimeLost: false,
        period,
        runningStartedAt: null,
      });
      return;
    }
    persist({ ...freezeRunning(clock), period });
  };

  /** Start from zero and run immediately (kick-off). */
  const startRunning = (period?: string) =>
    persist({
      elapsedSeconds: 0,
      isRunning: true,
      isTimeLost: false,
      period: period ?? clock.period,
      runningStartedAt: Date.now(),
    });

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
    startRunning,
    stopClock,
    setPeriod,
    persist,
    applyServerClock,
    formatTime,
    elapsedMinutes,
  };
}
