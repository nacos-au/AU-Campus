"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompetitionRosterPlayer } from "@/lib/data/competition-rosters";
import {
  defaultLineupStatusForKickoff,
  isPredictedLineupWindow,
  lineupStatusLabel,
} from "@/lib/match/lineup-window";
import type { LineupSheetStatus } from "@/lib/types/database";

/**
 * Quick XI picker from a competition squad for a match side.
 */
export function AdminMatchLineupPanel({
  matchId,
  tournamentId,
  teamId,
  teamName,
  scheduledAt,
  maxStarters = 11,
}: {
  matchId: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  scheduledAt?: string | null;
  maxStarters?: number;
}) {
  const [pool, setPool] = useState<CompetitionRosterPlayer[]>([]);
  const [starters, setStarters] = useState<Set<string>>(new Set());
  const [bench, setBench] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<LineupSheetStatus>(
    defaultLineupStatusForKickoff(scheduledAt)
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const predictedWindow = isPredictedLineupWindow(scheduledAt);

  const load = useCallback(async () => {
    try {
      const [rosterRes, lineupRes] = await Promise.all([
        fetch(`/api/competitions/${tournamentId}/roster?teamId=${encodeURIComponent(teamId)}`),
        fetch(`/api/matches/${matchId}/lineup?teamId=${encodeURIComponent(teamId)}`),
      ]);
      const rosterJson = (await rosterRes.json()) as { nominated?: CompetitionRosterPlayer[] };
      setPool(rosterJson.nominated ?? []);

      const lineupJson = (await lineupRes.json()) as {
        lineup?: {
          players?: Array<{ player_id: string; is_starting: boolean }>;
          status?: LineupSheetStatus;
        } | null;
      };
      const players = lineupJson.lineup?.players ?? [];
      setStarters(new Set(players.filter((p) => p.is_starting).map((p) => p.player_id)));
      setBench(new Set(players.filter((p) => !p.is_starting).map((p) => p.player_id)));
      if (lineupJson.lineup?.status) {
        setStatus(lineupJson.lineup.status);
      } else {
        setStatus(defaultLineupStatusForKickoff(scheduledAt));
      }
    } catch {
      setPool([]);
    }
  }, [tournamentId, teamId, matchId, scheduledAt]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(playerId: string, as: "start" | "bench") {
    setStarters((prev) => {
      const next = new Set(prev);
      if (as === "start") {
        if (next.has(playerId)) next.delete(playerId);
        else if (next.size < maxStarters) next.add(playerId);
      } else next.delete(playerId);
      return next;
    });
    setBench((prev) => {
      const next = new Set(prev);
      if (as === "bench") {
        if (next.has(playerId)) next.delete(playerId);
        else next.add(playerId);
      } else next.delete(playerId);
      return next;
    });
  }

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    const players = [
      ...[...starters].map((id) => ({ player_id: id, is_starting: true })),
      ...[...bench].map((id) => ({ player_id: id, is_starting: false })),
    ];
    try {
      const res = await fetch(`/api/matches/${matchId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, players, status }),
      });
      const json = (await res.json()) as { error?: string; status?: LineupSheetStatus };
      if (!res.ok) {
        setError(json.error ?? "Could not save lineup");
        return;
      }
      if (json.status) setStatus(json.status);
      setMessage(`${lineupStatusLabel(json.status ?? status)} saved for ${teamName}.`);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (pool.length === 0) {
    return (
      <p className="text-sm text-accent/60">
        No competition squad for {teamName} yet — fill squads first.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-rule p-4">
      <h3 className="font-display text-sm font-extrabold">
        {teamName} XI · {starters.size}/{maxStarters} starters
      </h3>
      <label className="block text-xs">
        <span className="font-semibold text-accent/70">Sheet status</span>
        <select
          className="mt-1 w-full rounded-lg border border-rule px-2 py-1.5 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as LineupSheetStatus)}
        >
          <option value="predicted" disabled={!predictedWindow}>
            Predicted{!predictedWindow ? " (locked after T−60)" : ""}
          </option>
          <option value="confirmed">Confirmed</option>
        </select>
      </label>
      <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
        {pool.map((p) => {
          const isStart = starters.has(p.player_id);
          const isBench = bench.has(p.player_id);
          return (
            <li key={p.player_id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p.first_name} {p.last_name}
              </span>
              <button
                type="button"
                onClick={() => toggle(p.player_id, "start")}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isStart ? "btn-filled" : "border border-rule"
                }`}
              >
                XI
              </button>
              <button
                type="button"
                onClick={() => toggle(p.player_id, "bench")}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isBench ? "btn-filled" : "border border-rule"
                }`}
              >
                Bench
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={busy || starters.size === 0}
        onClick={() => void submit()}
        className="btn-filled rounded-full px-4 py-2 text-xs font-bold disabled:opacity-40"
      >
        {busy ? "Saving…" : `Submit ${lineupStatusLabel(status)}`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
