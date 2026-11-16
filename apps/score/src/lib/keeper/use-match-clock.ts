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

/** Absolute match-minute ceiling for the active play period (cumulative). */
export function cumulativeCapSeconds(period: string): number {
  if (period === "half_1" || period === "half_time") return 45 * 60;
  if (period === "half_2" || period === "full_time") return 90 * 60;
  if (period === "extra_time_1") return 105 * 60;
  if (period === "extra_time_2") return 120 * 60;
  if (period === "penalty_shootout") return 120 * 60;
  return 45 * 60;
}

/** Where the main clock resumes when entering this period. */
export function periodStartSeconds(period: string): number {
  if (period === "half_2") return 45 * 60;
  if (period === "extra_time_1") return 90 * 60;
  if (period === "extra_time_2") return 105 * 60;
  return 0;
}

/** Elapsed seconds including wall time while running — capped at period regulation. */
export function liveElapsedSeconds(state: MatchClockState): number {
  const cap = cumulativeCapSeconds(state.period);
  let raw = state.elapsedSeconds;
  if (state.isRunning && state.runningStartedAt != null) {
    const extra = Math.max(0, Math.floor((Date.now() - state.runningStartedAt) / 1000));
    raw = state.elapsedSeconds + extra;
  }
  return Math.min(raw, cap);
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

/** True when main clock has reached regulation for the current play period. */
export function isAtRegulation(state: MatchClockState): boolean {
  if (state.period === "half_time" || state.period === "full_time" || state.period === "penalty_shootout") {
    return true;
  }
  return liveElapsedSeconds(state) >= cumulativeCapSeconds(state.period);
}

export function normalizeStored(raw: unknown): MatchClockState {
  const s = raw as Partial<MatchClockState>;
  const period = typeof s.period === "string" ? s.period : "half_1";
  const cap = cumulativeCapSeconds(period);
  const elapsed = typeof s.elapsedSeconds === "number" ? Math.min(Math.max(0, s.elapsedSeconds), cap) : 0;
  return {
    elapsedSeconds: elapsed,
    isRunning: Boolean(s.isRunning),
    isTimeLost: Boolean(s.isTimeLost),
    period,
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
    return {
      ...state,
      elapsedSeconds: Math.min(state.elapsedSeconds, cumulativeCapSeconds(state.period)),
      isRunning: false,
      runningStartedAt: null,
    };
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

/** Freeze main at regulation and open stoppage if needed. */
function enterStoppagePhase(state: MatchClockState): MatchClockState {
  const cap = cumulativeCapSeconds(state.period);
  let next = freezeRunning({
    ...state,
    elapsedSeconds: Math.min(liveElapsedSeconds(state), cap),
  });
  next = { ...next, elapsedSeconds: cap, isRunning: false, runningStartedAt: null };
  if (!next.isTimeLost) {
    next = {
      ...next,
      isTimeLost: true,
      timeLostStartedAt: Date.now(),
    };
  }
  return next;
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
  const period =
    row.current_period && row.current_period !== "not_started" ? row.current_period : "half_1";
  const cap = cumulativeCapSeconds(period);
  const running = Boolean(row.clock_is_running);
  const timeLost = Boolean(row.clock_is_time_lost);
  const startedAt = row.clock_running_started_at
    ? new Date(row.clock_running_started_at).getTime()
    : null;
  const lostStartedAt = row.clock_time_lost_started_at
    ? new Date(row.clock_time_lost_started_at).getTime()
    : null;
  return {
    elapsedSeconds: Math.min(row.clock_elapsed_seconds ?? 0, cap),
    isRunning: running,
    isTimeLost: timeLost,
    period,
    runningStartedAt: running ? startedAt : null,
    stoppageSeconds: row.clock_stoppage_seconds ?? 0,
    boardedStoppageMinutes: row.clock_boarded_stoppage_minutes ?? 0,
    timeLostStartedAt: timeLost ? lostStartedAt : null,
  };
}

export function clockToServerPayload(state: MatchClockState) {
  return {
    clock_elapsed_seconds: Math.min(state.elapsedSeconds, cumulativeCapSeconds(state.period)),
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
 * Cumulative: `12'`, `45+2'`, `67'`, `90+3'`.
 */
export function formatFootballMatchTime(
  elapsedSeconds: number,
  period: string,
  boardedStoppageMinutes: number,
  liveStoppageSecs = 0
): string {
  const absoluteMin = Math.floor(elapsedSeconds / 60);
  const halfEnd =
    period === "half_1" || period === "half_time"
      ? 45
      : period.startsWith("extra_time_1")
        ? 105
        : period.startsWith("extra_time")
          ? 120
          : 90;

  if (absoluteMin < halfEnd && liveStoppageSecs <= 0 && boardedStoppageMinutes <= 0) {
    return `${absoluteMin}'`;
  }

  if (absoluteMin < halfEnd && !isStoppageDisplay(period, elapsedSeconds, liveStoppageSecs)) {
    return `${absoluteMin}'`;
  }

  const fromLost = boardStoppageMinutesFromSeconds(liveStoppageSecs);
  const pastReg = Math.max(0, absoluteMin - halfEnd);
  const plus = Math.max(pastReg, boardedStoppageMinutes, fromLost, liveStoppageSecs > 0 ? 1 : 0);
  if (plus <= 0) return `${Math.min(absoluteMin, halfEnd)}'`;
  return `${halfEnd}+${plus}'`;
}

function isStoppageDisplay(period: string, elapsedSeconds: number, liveStoppageSecs: number): boolean {
  return liveStoppageSecs > 0 || elapsedSeconds >= cumulativeCapSeconds(period);
}

export function clearClockStorage(matchId: string) {
  try {
    localStorage.removeItem(storageKey(matchId));
  } catch {
    /* ignore */
  }
}

/**
 * Match clock. Wall-clock math (accurate across tab sleep).
 * Main elapsed is capped at half regulation; stoppage runs as a secondary timer.
 */
export function useMatchClock(
  matchId: string,
  initial?: Partial<MatchClockState>,
  opts?: {
    spectator?: boolean;
    syncToServer?: boolean;
  }
) {
  const spectator = Boolean(opts?.spectator);
  const syncToServer = Boolean(opts?.syncToServer);
  const [clock, setClock] = useState<MatchClockState>(() => {
    if (typeof window === "undefined") {
      return normalizeStored({ ...DEFAULT, ...initial, runningStartedAt: null });
    }
    if (!spectator) {
      try {
        const raw = localStorage.getItem(storageKey(matchId));
        if (raw) return normalizeStored(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    return normalizeStored({ ...DEFAULT, ...initial, runningStartedAt: null });
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
      const capped = {
        ...next,
        elapsedSeconds: Math.min(next.elapsedSeconds, cumulativeCapSeconds(next.period)),
      };
      setClock(capped);
      writeLocal(capped);
      pushServer(capped);
    },
    [pushServer, writeLocal]
  );

  const applyServerClock = useCallback(
    (next: MatchClockState) => {
      const capped = normalizeStored(next);
      setClock(capped);
      writeLocal(capped);
    },
    [writeLocal]
  );

  const flushWallClock = useCallback(() => {
    setClock((prev) => {
      let next = prev;
      if (prev.isRunning && prev.runningStartedAt != null) {
        const live = liveElapsedSeconds(prev);
        const cap = cumulativeCapSeconds(prev.period);
        if (live >= cap) {
          next = enterStoppagePhase(prev);
        } else {
          next = {
            ...next,
            elapsedSeconds: live,
            runningStartedAt: Date.now(),
          };
        }
      }
      if (next.isTimeLost && next.timeLostStartedAt != null) {
        const stoppage = liveStoppageSeconds(next);
        next = {
          ...next,
          stoppageSeconds: stoppage,
          timeLostStartedAt: Date.now(),
          boardedStoppageMinutes: Math.max(
            next.boardedStoppageMinutes,
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

  // Auto-cap main clock at regulation → enter stoppage phase.
  useEffect(() => {
    if (spectator) return;
    if (!clock.isRunning) return;
    if (clock.period === "half_time" || clock.period === "full_time") return;
    const live = liveElapsedSeconds(clock);
    const cap = cumulativeCapSeconds(clock.period);
    if (live < cap) return;
    persist(enterStoppagePhase(clock));
  }, [clock, persist, spectator, clock.isRunning, clock.elapsedSeconds, clock.runningStartedAt]);

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

  useEffect(() => {
    if (!syncToServer) return;
    if (!clock.isRunning && !clock.isTimeLost) return;
    const id = setInterval(() => {
      pushServer(clockRef.current);
    }, 5000);
    return () => clearInterval(id);
  }, [clock.isRunning, clock.isTimeLost, pushServer, syncToServer]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        flushWallClock();
      } else {
        // Re-anchor after restore so wall math stays accurate.
        flushWallClock();
      }
    };
    const onPageHide = () => flushWallClock();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [flushWallClock]);

  const cappedElapsed = liveElapsedSeconds(clock);
  const liveStoppage = liveStoppageSeconds(clock);
  const atReg = cappedElapsed >= cumulativeCapSeconds(clock.period);
  const inStoppagePhase =
    clock.isTimeLost ||
    (atReg &&
      clock.period !== "half_time" &&
      clock.period !== "full_time" &&
      !clock.isRunning);

  const display = {
    ...clock,
    elapsedSeconds: cappedElapsed,
    stoppageSeconds: liveStoppage,
    boardedStoppageMinutes: Math.max(
      clock.boardedStoppageMinutes,
      boardStoppageMinutesFromSeconds(liveStoppage)
    ),
    inStoppagePhase,
    atRegulation: atReg,
  };

  const setRunning = (isRunning: boolean) => {
    if (isRunning) {
      if (clock.period === "half_time" || clock.period === "full_time") return;
      if (isAtRegulation(clock)) {
        persist(enterStoppagePhase(clock));
        return;
      }
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

  const setTimeLost = (isTimeLost: boolean) => {
    if (isTimeLost) {
      if (clock.isTimeLost) return;
      // Before regulation: accumulate in background without freezing main unless already at cap.
      if (isAtRegulation(clock) || liveElapsedSeconds(clock) >= cumulativeCapSeconds(clock.period)) {
        persist(enterStoppagePhase(clock));
        return;
      }
      persist({
        ...clock,
        elapsedSeconds: liveElapsedSeconds(clock),
        runningStartedAt: clock.isRunning ? Date.now() : clock.runningStartedAt,
        isTimeLost: true,
        timeLostStartedAt: Date.now(),
      });
      return;
    }
    const frozen = freezeTimeLost({
      ...clock,
      elapsedSeconds: liveElapsedSeconds(clock),
      runningStartedAt: clock.isRunning ? Date.now() : null,
    });
    // After regulation, turning waste off keeps main frozen at cap.
    if (frozen.elapsedSeconds >= cumulativeCapSeconds(frozen.period)) {
      persist({ ...frozen, isRunning: false, runningStartedAt: null });
      return;
    }
    persist(frozen);
  };

  const boardStoppage = (): number => {
    const frozen = freezeTimeLost(freezeRunning(clock));
    persist(frozen);
    return frozen.boardedStoppageMinutes;
  };

  const resetClock = (period?: string) => {
    clearClockStorage(matchId);
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
  };

  const stopClock = () => {
    persist(freezeTimeLost(freezeRunning(clock)));
  };

  const setPeriod = (period: string, opts?: { resetElapsed?: boolean }) => {
    const frozen = freezeTimeLost(freezeRunning(clock));
    if (opts?.resetElapsed) {
      // Legacy path — prefer startSecondHalf / enterHalfTime helpers.
      persist({
        ...frozen,
        elapsedSeconds: periodStartSeconds(period),
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

  /** Kick-off: clear storage and run from 00:00. */
  const startRunning = (period?: string) => {
    clearClockStorage(matchId);
    persist({
      elapsedSeconds: 0,
      isRunning: true,
      isTimeLost: false,
      period: period ?? "half_1",
      runningStartedAt: Date.now(),
      stoppageSeconds: 0,
      boardedStoppageMinutes: 0,
      timeLostStartedAt: null,
    });
  };

  /** End H1 stoppage → Halftime (main frozen at 45:00). */
  const enterHalfTime = () => {
    const frozen = freezeTimeLost(freezeRunning(clock));
    persist({
      ...frozen,
      elapsedSeconds: 45 * 60,
      isRunning: false,
      isTimeLost: false,
      period: "half_time",
      runningStartedAt: null,
      timeLostStartedAt: null,
    });
  };

  /** Resume from Halftime at 45:00 into 2nd half. */
  const startSecondHalf = () => {
    clearClockStorage(matchId);
    persist({
      elapsedSeconds: 45 * 60,
      isRunning: true,
      isTimeLost: false,
      period: "half_2",
      runningStartedAt: Date.now(),
      stoppageSeconds: 0,
      boardedStoppageMinutes: 0,
      timeLostStartedAt: null,
    });
  };

  /** End H2 stoppage → Full time (main frozen at 90:00). */
  const enterFullTime = () => {
    const frozen = freezeTimeLost(freezeRunning(clock));
    persist({
      ...frozen,
      elapsedSeconds: Math.max(frozen.elapsedSeconds, 90 * 60),
      isRunning: false,
      isTimeLost: false,
      period: "full_time",
      runningStartedAt: null,
      timeLostStartedAt: null,
    });
  };

  /** Time hopper — clamp to active half (cap + 30′ stoppage buffer). */
  const setElapsed = (seconds: number) => {
    const cap = cumulativeCapSeconds(clock.period);
    const max = cap + 30 * 60;
    const nextSeconds = Math.min(max, Math.max(0, Math.floor(seconds)));
    const atCap = nextSeconds >= cap;
    persist({
      ...clock,
      elapsedSeconds: Math.min(nextSeconds, cap),
      isRunning: atCap ? false : clock.isRunning,
      isTimeLost: atCap ? true : clock.isTimeLost,
      runningStartedAt: atCap ? null : clock.isRunning ? Date.now() : null,
      timeLostStartedAt: atCap
        ? Date.now()
        : clock.isTimeLost
          ? Date.now()
          : null,
      stoppageSeconds: atCap
        ? Math.max(0, nextSeconds - cap) + (clock.isTimeLost ? liveStoppageSeconds(clock) : clock.stoppageSeconds)
        : clock.isTimeLost
          ? liveStoppageSeconds(clock)
          : clock.stoppageSeconds,
    });
  };

  const formatTime = () => {
    const total = display.elapsedSeconds;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatStoppageTime = () => {
    const total = display.stoppageSeconds;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatMatchMinute = () =>
    formatFootballMatchTime(
      display.elapsedSeconds,
      display.period,
      display.boardedStoppageMinutes,
      display.isTimeLost || display.inStoppagePhase ? display.stoppageSeconds : 0
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
    enterHalfTime,
    startSecondHalf,
    enterFullTime,
    persist,
    applyServerClock,
    formatTime,
    formatStoppageTime,
    formatMatchMinute,
    elapsedMinutes,
  };
}
