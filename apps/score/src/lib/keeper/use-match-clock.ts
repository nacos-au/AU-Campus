"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MatchClockState {
  elapsedSeconds: number;
  isRunning: boolean;
  isTimeLost: boolean;
  period: string;
  /** Wall-clock start of the current run (survives tab sleep / screen-off). */
  runningStartedAt: number | null;
  /** Accumulated injury / time-wasting seconds for the current period. */
  stoppageSeconds: number;
  /** Announced +N minutes for the current period (boarded stoppage). */
  boardedStoppageMinutes: number;
  /** Wall-clock start of the current Waste stretch. */
  timeLostStartedAt: number | null;
}

const DEFAULT: MatchClockState = {
  elapsedSeconds: 0,
  isRunning: false,
  isTimeLost: false,
  period: "half_1",
  runningStartedAt: null,
  stoppageSeconds: 0,
  boardedStoppageMinutes: 0,
  timeLostStartedAt: null,
};

function storageKey(matchId: string) {
  return `au-score-clock-${matchId}`;
}

/** Elapsed seconds including wall time while the match clock is running (waste does not pause). */
export function liveElapsedSeconds(state: MatchClockState): number {
  if (!state.isRunning || state.runningStartedAt == null) {
    return state.elapsedSeconds;
  }
  const extra = Math.max(0, Math.floor((Date.now() - state.runningStartedAt) / 1000));
  return state.elapsedSeconds + extra;
}

/** Live stoppage seconds including an open Waste stretch. */
export function liveStoppageSeconds(state: MatchClockState): number {
  if (!state.isTimeLost || state.timeLostStartedAt == null) {
    return state.stoppageSeconds;
  }
  const extra = Math.max(0, Math.floor((Date.now() - state.timeLostStartedAt) / 1000));
  return state.stoppageSeconds + extra;
}

export function boardStoppageMinutesFromSeconds(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.ceil(seconds / 60));
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
        : s.isRunning
          ? Date.now()
          : null,
    stoppageSeconds: typeof s.stoppageSeconds === "number" ? s.stoppageSeconds : 0,
    boardedStoppageMinutes:
      typeof s.boardedStoppageMinutes === "number" ? s.boardedStoppageMinutes : 0,
    timeLostStartedAt:
      typeof s.timeLostStartedAt === "number"
        ? s.timeLostStartedAt
        : s.isTimeLost
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

function freezeTimeLost(state: MatchClockState): MatchClockState {
  if (!state.isTimeLost || state.timeLostStartedAt == null) {
    return { ...state, isTimeLost: false, timeLostStartedAt: null };
  }
  const stoppageSeconds = liveStoppageSeconds(state);
  const boarded = Math.max(
    state.boardedStoppageMinutes,
    boardStoppageMinutesFromSeconds(stoppageSeconds)
  );
  return {
    ...state,
    stoppageSeconds,
    boardedStoppageMinutes: boarded,
    isTimeLost: false,
    timeLostStartedAt: null,
  };
}

export function clockFromServer(row: {
  clock_elapsed_seconds?: number | null;
  clock_is_running?: boolean | null;
  clock_is_time_lost?: boolean | null;
  clock_running_started_at?: string | null;
  clock_stoppage_seconds?: number | null;
  clock_boarded_stoppage_minutes?: number | null;
  clock_time_lost_started_at?: string | null;
  current_period?: string | null;
}): MatchClockState {
  const running = Boolean(row.clock_is_running);
  const timeLost = Boolean(row.clock_is_time_lost);
  const startedAt = row.clock_running_started_at
    ? new Date(row.clock_running_started_at).getTime()
    : null;
  const lostStartedAt = row.clock_time_lost_started_at
    ? new Date(row.clock_time_lost_started_at).getTime()
    : null;
  return {
    elapsedSeconds: row.clock_elapsed_seconds ?? 0,
    isRunning: running,
    isTimeLost: timeLost,
    period: row.current_period && row.current_period !== "not_started" ? row.current_period : "half_1",
    runningStartedAt: running ? startedAt : null,
    stoppageSeconds: row.clock_stoppage_seconds ?? 0,
    boardedStoppageMinutes: row.clock_boarded_stoppage_minutes ?? 0,
    timeLostStartedAt: timeLost ? lostStartedAt : null,
  };
}

export function clockToServerPayload(state: MatchClockState) {
  // Publish base elapsed + run start so spectators add wall time themselves
  // (do NOT publish already-composited live seconds or they double-count).
  // Match clock runs independently of waste — publish isRunning as-is.
  return {
    clock_elapsed_seconds: state.elapsedSeconds,
    clock_is_running: state.isRunning,
    clock_is_time_lost: state.isTimeLost,
    clock_running_started_at:
      state.isRunning && state.runningStartedAt != null
        ? new Date(state.runningStartedAt).toISOString()
        : null,
    clock_stoppage_seconds: state.stoppageSeconds,
    clock_boarded_stoppage_minutes: state.boardedStoppageMinutes,
    clock_time_lost_started_at:
      state.isTimeLost && state.timeLostStartedAt != null
        ? new Date(state.timeLostStartedAt).toISOString()
        : null,
  };
}

/** Regulation minutes for football period display (kickoff of stoppage clock). */
export function regulationMinutesForPeriod(period: string): number {
  if (period === "half_1") return 45;
  if (period === "half_2") return 45;
  if (period.startsWith("extra_time")) return 15;
  return 45;
}

/**
 * Football event / board clock label.
 * Before regulation end: `12'`. In stoppage: `45+2'`.
 */
export function formatFootballMatchTime(
  elapsedSeconds: number,
  period: string,
  boardedStoppageMinutes: number,
  liveStoppageSecs = 0
): string {
  const regulation = regulationMinutesForPeriod(period);
  const elapsedMin = Math.floor(elapsedSeconds / 60);
  if (elapsedMin < regulation) return `${elapsedMin}'`;

  const pastReg = Math.floor((elapsedSeconds - regulation * 60) / 60);
  const fromLost = boardStoppageMinutesFromSeconds(liveStoppageSecs);
  const plus = Math.max(pastReg, boardedStoppageMinutes, fromLost, 1);
  return `${regulation}+${plus}'`;
}

/**
 * Match clock. Uses wall-clock math so elapsed advances 1s/s even if the
 * interval drifts. Optionally pushes to the server for public spectators.
 * Playing and Waste run in parallel — waste never pauses match elapsed.
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
      let next = prev;
      if (prev.isRunning && prev.runningStartedAt != null) {
        next = {
          ...next,
          elapsedSeconds: liveElapsedSeconds(prev),
          runningStartedAt: Date.now(),
        };
      }
      if (prev.isTimeLost && prev.timeLostStartedAt != null) {
        const stoppage = liveStoppageSeconds(prev);
        next = {
          ...next,
          stoppageSeconds: stoppage,
          timeLostStartedAt: Date.now(),
          boardedStoppageMinutes: Math.max(
            prev.boardedStoppageMinutes,
            boardStoppageMinutesFromSeconds(stoppage)
          ),
        };
      }
      if (next === prev) return prev;
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
    if (!clock.isRunning && !clock.isTimeLost) return;
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

  // Heartbeat while running or accumulating stoppage so spectators stay within ~5s.
  useEffect(() => {
    if (!syncToServer) return;
    if (!clock.isRunning && !clock.isTimeLost) return;
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

  const display = {
    ...clock,
    elapsedSeconds: liveElapsedSeconds(clock),
    stoppageSeconds: liveStoppageSeconds(clock),
    boardedStoppageMinutes: Math.max(
      clock.boardedStoppageMinutes,
      boardStoppageMinutesFromSeconds(liveStoppageSeconds(clock))
    ),
  };

  const setRunning = (isRunning: boolean) => {
    if (isRunning) {
      persist({
        ...clock,
        elapsedSeconds: liveElapsedSeconds(clock),
        isRunning: true,
        runningStartedAt: Date.now(),
      });
      return;
    }
    persist(freezeRunning(clock));
  };

  /** Toggle waste/stoppage accumulator — does not pause match elapsed. */
  const setTimeLost = (isTimeLost: boolean) => {
    if (isTimeLost) {
      if (clock.isTimeLost) return;
      persist({
        ...clock,
        elapsedSeconds: liveElapsedSeconds(clock),
        runningStartedAt: clock.isRunning ? Date.now() : clock.runningStartedAt,
        isTimeLost: true,
        timeLostStartedAt: Date.now(),
      });
      return;
    }
    // Board accumulated stoppage as +N; leave Playing state alone.
    const frozen = freezeTimeLost({
      ...clock,
      elapsedSeconds: liveElapsedSeconds(clock),
      runningStartedAt: clock.isRunning ? Date.now() : null,
    });
    persist(frozen);
  };

  /** Freeze any open waste stretch and return boarded +N (for logging). */
  const boardStoppage = (): number => {
    const frozen = freezeTimeLost({
      ...freezeRunning(clock),
      // boardStoppage used at half-end — stop playing too
    });
    persist(frozen);
    return frozen.boardedStoppageMinutes;
  };

  const resetClock = (period?: string) =>
    persist({
      elapsedSeconds: 0,
      isRunning: false,
      isTimeLost: false,
      period: period ?? clock.period,
      runningStartedAt: null,
      stoppageSeconds: 0,
      boardedStoppageMinutes: 0,
      timeLostStartedAt: null,
    });

  const stopClock = () => {
    const frozen = freezeTimeLost(freezeRunning(clock));
    persist(frozen);
  };

  const setPeriod = (period: string, opts?: { resetElapsed?: boolean }) => {
    const frozen = freezeTimeLost(freezeRunning(clock));
    if (opts?.resetElapsed) {
      persist({
        ...frozen,
        elapsedSeconds: 0,
        isRunning: false,
        isTimeLost: false,
        period,
        runningStartedAt: null,
        stoppageSeconds: 0,
        boardedStoppageMinutes: 0,
        timeLostStartedAt: null,
      });
      return;
    }
    persist({ ...frozen, period });
  };

  /** Start from zero and run immediately (kick-off). */
  const startRunning = (period?: string) =>
    persist({
      elapsedSeconds: 0,
      isRunning: true,
      isTimeLost: false,
      period: period ?? clock.period,
      runningStartedAt: Date.now(),
      stoppageSeconds: 0,
      boardedStoppageMinutes: 0,
      timeLostStartedAt: null,
    });

  /** Jump / set elapsed (time hopper / late start). Keeps running + waste state. */
  const setElapsed = (seconds: number) => {
    const nextSeconds = Math.max(0, Math.floor(seconds));
    const running = clock.isRunning;
    const wasting = clock.isTimeLost;
    persist({
      ...clock,
      elapsedSeconds: nextSeconds,
      isRunning: running,
      isTimeLost: wasting,
      runningStartedAt: running ? Date.now() : null,
      timeLostStartedAt: wasting ? Date.now() : null,
      stoppageSeconds: wasting ? liveStoppageSeconds(clock) : clock.stoppageSeconds,
    });
  };

  const formatTime = () => {
    const total = display.elapsedSeconds;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatMatchMinute = () =>
    formatFootballMatchTime(
      display.elapsedSeconds,
      display.period,
      display.boardedStoppageMinutes,
      display.isTimeLost ? display.stoppageSeconds : 0
    );

  const elapsedMinutes = Math.floor(display.elapsedSeconds / 60);

  return {
    clock: display,
    setRunning,
    setTimeLost,
    boardStoppage,
    resetClock,
    startRunning,
    setElapsed,
    stopClock,
    setPeriod,
    persist,
    applyServerClock,
    formatTime,
    formatMatchMinute,
    elapsedMinutes,
  };
}
