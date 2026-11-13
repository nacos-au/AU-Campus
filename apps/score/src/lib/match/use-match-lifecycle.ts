"use client";

import { useCallback, useEffect, useState } from "react";
import type { MatchStatus } from "@/lib/types/database";

export type LifecycleStatus = Extract<MatchStatus, "scheduled" | "live" | "completed">;

export interface MatchLifecycleState {
  status: LifecycleStatus;
  startedAt: string | null;
  endedAt: string | null;
}

function storageKey(matchId: string) {
  return `au-score-lifecycle-${matchId}`;
}

function loadState(matchId: string, initialStatus: LifecycleStatus): MatchLifecycleState {
  if (typeof window === "undefined") {
    return { status: initialStatus, startedAt: null, endedAt: null };
  }
  // Prefer server truth when the match is already live/completed.
  if (initialStatus === "live" || initialStatus === "completed") {
    return {
      status: initialStatus,
      startedAt: initialStatus === "live" ? new Date().toISOString() : null,
      endedAt: initialStatus === "completed" ? new Date().toISOString() : null,
    };
  }
  try {
    const raw = localStorage.getItem(storageKey(matchId));
    if (raw) return JSON.parse(raw) as MatchLifecycleState;
  } catch {
    /* ignore */
  }
  return { status: initialStatus, startedAt: null, endedAt: null };
}

export function useMatchLifecycle(
  matchId: string,
  initial: { status: LifecycleStatus; scheduledAt?: string | null }
) {
  const [state, setState] = useState<MatchLifecycleState>(() =>
    loadState(matchId, initial.status)
  );

  const persist = useCallback(
    (next: MatchLifecycleState) => {
      setState(next);
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
        setState(JSON.parse(e.newValue) as MatchLifecycleState);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [matchId]);

  const startMatch = useCallback(async (): Promise<{ ok: true } | { error: string }> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "live", fresh_kickoff: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { error: json.error ?? "Could not start match" };
      }
    } catch {
      /* demo/local still works without API */
    }

    persist({
      status: "live",
      startedAt: new Date().toISOString(),
      endedAt: null,
    });
    return { ok: true };
  }, [matchId, persist]);

  const endMatch = useCallback(async () => {
    const next: MatchLifecycleState = {
      ...state,
      status: "completed",
      endedAt: new Date().toISOString(),
    };
    persist(next);

    try {
      await fetch(`/api/matches/${matchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    } catch {
      /* demo/local still works */
    }
  }, [matchId, persist, state]);

  const reconcileFromServer = useCallback(
    (status: LifecycleStatus) => {
      setState((prev) => {
        if (prev.status === status) return prev;
        const next: MatchLifecycleState = {
          status,
          startedAt:
            status === "live" ? prev.startedAt ?? new Date().toISOString() : prev.startedAt,
          endedAt:
            status === "completed" ? prev.endedAt ?? new Date().toISOString() : prev.endedAt,
        };
        try {
          localStorage.setItem(storageKey(matchId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [matchId]
  );

  return {
    status: state.status,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    isLive: state.status === "live",
    isScheduled: state.status === "scheduled",
    isCompleted: state.status === "completed",
    startMatch,
    endMatch,
    reconcileFromServer,
  };
}
