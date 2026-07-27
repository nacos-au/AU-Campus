"use client";

import { useCallback, useEffect, useState } from "react";

export interface MatchClockState {
  elapsedSeconds: number;
  isRunning: boolean;
  isTimeLost: boolean;
  period: string;
}

const DEFAULT: MatchClockState = {
  elapsedSeconds: 0,
  isRunning: false,
  isTimeLost: false,
  period: "half_1",
};

function storageKey(matchId: string) {
  return `au-score-clock-${matchId}`;
}

export function useMatchClock(matchId: string, initial?: Partial<MatchClockState>) {
  const [clock, setClock] = useState<MatchClockState>(() => {
    if (typeof window === "undefined") return { ...DEFAULT, ...initial };
    try {
      const raw = localStorage.getItem(storageKey(matchId));
      if (raw) return JSON.parse(raw) as MatchClockState;
    } catch {
      /* ignore */
    }
    return { ...DEFAULT, ...initial };
  });

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

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(matchId) && e.newValue) {
        setClock(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [matchId]);

  useEffect(() => {
    if (!clock.isRunning || clock.isTimeLost) return;
    const id = setInterval(() => {
      setClock((prev) => {
        const next = { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        try {
          localStorage.setItem(storageKey(matchId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [clock.isRunning, clock.isTimeLost, matchId]);

  const setRunning = (isRunning: boolean) => persist({ ...clock, isRunning });
  const setTimeLost = (isTimeLost: boolean) => persist({ ...clock, isTimeLost, isRunning: !isTimeLost });
  const resetClock = (period?: string) =>
    persist({
      elapsedSeconds: 0,
      isRunning: false,
      isTimeLost: false,
      period: period ?? clock.period,
    });
  const stopClock = () => persist({ ...clock, isRunning: false });
  const formatTime = () => {
    const m = Math.floor(clock.elapsedSeconds / 60);
    const s = clock.elapsedSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const elapsedMinutes = Math.floor(clock.elapsedSeconds / 60);

  return { clock, setRunning, setTimeLost, resetClock, stopClock, persist, formatTime, elapsedMinutes };
}
