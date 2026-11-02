"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompetitionRosterPlayer } from "@/lib/data/competition-rosters";

/**
 * Quick XI picker from a competition squad for a match side.
 */
export function AdminMatchLineupPanel({
  matchId,
  tournamentId,
  teamId,
  teamName,
  maxStarters = 11,
}: {
  matchId: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  maxStarters?: number;
}) {
  const [pool, setPool] = useState<CompetitionRosterPlayer[]>([]);
  const [starters, setStarters] = useState<Set<string>>(new Set());
  const [bench, setBench] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/competitions/${tournamentId}/roster?teamId=${encodeURIComponent(teamId)}`
      );
      const json = (await res.json()) as { nominated?: CompetitionRosterPlayer[] };
      setPool(json.nominated ?? []);
    } catch {
      setPool([]);
    }
  }, [tournamentId, teamId]);

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
        body: JSON.stringify({ team_id: teamId, players }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save lineup");
        return;
      }
      setMessage(`Lineup saved for ${teamName}.`);
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
        {busy ? "Saving…" : "Submit lineup"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
