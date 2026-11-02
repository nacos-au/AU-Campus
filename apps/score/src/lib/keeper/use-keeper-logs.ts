"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeeperLogEntry } from "@/lib/keeper/keeper-events";
import { createKeeperLog, keeperLogsStorageKey } from "@/lib/keeper/keeper-events";

type ApiEvent = {
  id: string;
  match_id: string;
  event_type: string;
  match_time: string;
  period: string;
  details: Record<string, unknown> | null;
  team_id: string;
  team_name?: string;
  team_code?: string;
  team_logo_url?: string | null;
  player?: { id?: string; first_name?: string; last_name?: string };
};

function mapApiEvent(row: ApiEvent): KeeperLogEntry {
  const details = row.details ?? {};
  const nameFromDetails =
    typeof details.player_name === "string" ? details.player_name : null;
  const playerName =
    nameFromDetails ||
    [row.player?.first_name, row.player?.last_name].filter(Boolean).join(" ") ||
    "Unknown";
  return createKeeperLog({
    id: row.id,
    match_time: row.match_time,
    period: row.period,
    team_id: row.team_id,
    team_name: row.team_name ?? "",
    team_code: row.team_code ?? "",
    team_logo_url: row.team_logo_url ?? null,
    player_id: row.player?.id ?? (typeof details.player_id === "string" ? details.player_id : null),
    player_name: playerName,
    event_type: row.event_type,
    assist_player_id:
      typeof details.assist_player_id === "string" ? details.assist_player_id : null,
    assist_player_name:
      typeof details.assist_player_name === "string" ? details.assist_player_name : null,
    details,
  });
}

async function postEvent(matchId: string, entry: KeeperLogEntry): Promise<string | null> {
  try {
    const res = await fetch(`/api/matches/${matchId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: entry.team_id || null,
        player_id: entry.player_id,
        event_type: entry.event_type,
        period: entry.period,
        match_time: entry.match_time,
        details: {
          ...(entry.details ?? {}),
          player_name: entry.player_name,
          team_name: entry.team_name,
          team_code: entry.team_code,
          assist_player_id: entry.assist_player_id,
          assist_player_name: entry.assist_player_name,
          player_out_id: entry.details?.player_out_id,
          player_out_name: entry.details?.player_out_name,
          player_in_id: entry.details?.player_in_id,
          player_in_name: entry.details?.player_in_name,
        },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Keeper event log — localStorage for instant UX, mirrored to the match_events API
 * so the public match page and other devices can see live scoring.
 */
export function useKeeperLogs(matchId: string) {
  const [logs, setLogs] = useState<KeeperLogEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      let local: KeeperLogEntry[] = [];
      try {
        const raw = localStorage.getItem(keeperLogsStorageKey(matchId));
        if (raw) local = JSON.parse(raw) as KeeperLogEntry[];
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(`/api/matches/${matchId}/events`);
        if (res.ok) {
          const json = (await res.json()) as { events?: ApiEvent[] };
          const remote = (json.events ?? []).map(mapApiEvent);
          if (remote.length) {
            local = remote;
            try {
              localStorage.setItem(keeperLogsStorageKey(matchId), JSON.stringify(remote));
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* keep local */
      }

      if (!cancelled) {
        setLogs(local);
        setHydrated(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const persistLocal = useCallback(
    (next: KeeperLogEntry[]) => {
      setLogs(next);
      try {
        localStorage.setItem(keeperLogsStorageKey(matchId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [matchId]
  );

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
      void postEvent(matchId, entry).then((serverId) => {
        if (!serverId || serverId === entry.id) return;
        setLogs((prev) => {
          const next = prev.map((l) => (l.id === entry.id ? { ...l, id: serverId } : l));
          try {
            localStorage.setItem(keeperLogsStorageKey(matchId), JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
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

  return { logs, addLog, removeLog, updateLog, hydrated, persistLocal };
}
