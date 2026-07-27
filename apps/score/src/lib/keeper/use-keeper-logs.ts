"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeeperLogEntry } from "@/lib/keeper/keeper-events";
import { keeperLogsStorageKey } from "@/lib/keeper/keeper-events";

export function useKeeperLogs(matchId: string) {
  const [logs, setLogs] = useState<KeeperLogEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keeperLogsStorageKey(matchId));
      if (raw) setLogs(JSON.parse(raw) as KeeperLogEntry[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [matchId]);

  const persist = useCallback((next: KeeperLogEntry[]) => {
    setLogs(next);
    try {
      localStorage.setItem(keeperLogsStorageKey(matchId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [matchId]);

  const addLog = useCallback(
    (entry: KeeperLogEntry) => {
      setLogs((prev) => {
        const next = [entry, ...prev];
        try {
          localStorage.setItem(keeperLogsStorageKey(matchId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [matchId]
  );

  const removeLog = useCallback(
    (id: string) => {
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        try {
          localStorage.setItem(keeperLogsStorageKey(matchId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [matchId]
  );

  const updateLog = useCallback(
    (id: string, patch: Partial<KeeperLogEntry>) => {
      setLogs((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
        try {
          localStorage.setItem(keeperLogsStorageKey(matchId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [matchId]
  );

  return { logs, addLog, removeLog, updateLog, hydrated };
}
