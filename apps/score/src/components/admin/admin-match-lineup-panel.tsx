"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CompetitionRosterPlayer } from "@/lib/data/competition-rosters";
import {
  defaultLineupStatusForKickoff,
  isPredictedLineupWindow,
  lineupStatusLabel,
} from "@/lib/match/lineup-window";
import {
  completeStartingXi,
  DEFAULT_FORMATION,
  FOOTBALL_FORMATIONS,
  normaliseAvailability,
  type PoolPlayer,
  type SheetEntry,
} from "@/lib/match/lineup-merge";
import { validateLineupSheet } from "@/lib/match/lineup-validate";
import type { LineupSheetStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

type Zone = "pool" | "xi" | "bench";

/**
 * Drag-and-drop XI builder from a competition squad for a match side.
 * Requires full starters + at least one sub; optional captain + coach.
 */
export function AdminMatchLineupPanel({
  matchId,
  tournamentId,
  teamId,
  teamName,
  scheduledAt,
  maxStarters = 11,
  defaultCoach = "",
}: {
  matchId: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  scheduledAt?: string | null;
  maxStarters?: number;
  defaultCoach?: string;
}) {
  const [pool, setPool] = useState<CompetitionRosterPlayer[]>([]);
  const [xi, setXi] = useState<string[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState(defaultCoach);
  const [status, setStatus] = useState<LineupSheetStatus>(
    defaultLineupStatusForKickoff(scheduledAt)
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [autoFilled, setAutoFilled] = useState(0);
  const predictedWindow = isPredictedLineupWindow(scheduledAt);

  const byId = useMemo(() => new Map(pool.map((p) => [p.player_id, p])), [pool]);

  const load = useCallback(async () => {
    try {
      const [rosterRes, lineupRes] = await Promise.all([
        fetch(`/api/competitions/${tournamentId}/roster?teamId=${encodeURIComponent(teamId)}`),
        fetch(`/api/matches/${matchId}/lineup?teamId=${encodeURIComponent(teamId)}`),
      ]);
      const rosterJson = (await rosterRes.json()) as {
        nominated?: CompetitionRosterPlayer[];
        formation?: string;
      };
      const nominated = rosterJson.nominated ?? [];
      setPool(nominated);

      const lineupJson = (await lineupRes.json()) as {
        lineup?: {
          players?: Array<{ player_id: string; is_starting: boolean; is_captain?: boolean; role?: string | null; jersey_number?: number | null }>;
          status?: LineupSheetStatus;
          coach_name?: string | null;
          formation?: string | null;
        } | null;
      };
      const storedFormation = lineupJson.lineup?.formation ?? rosterJson.formation ?? DEFAULT_FORMATION;
      setFormation(storedFormation);

      // Predicted XI: a missing or partial sheet is completed from the squad.
      // Named starters stay put; the rest of the squad sits on the bench.
      const stored = lineupJson.lineup?.players ?? [];
      const sheet: SheetEntry[] = stored.map((p) => ({
        player_id: p.player_id,
        is_starting: p.is_starting,
        role: p.role ?? null,
        is_captain: p.is_captain === true,
        jersey_number: p.jersey_number ?? null,
      }));
      const poolPlayers: PoolPlayer[] = nominated.map((p) => ({
        player_id: p.player_id,
        position: p.position,
        jersey_number: p.jersey_number,
        available: normaliseAvailability(p.availability) === "available",
      }));
      const completed = completeStartingXi({
        sheet,
        pool: poolPlayers,
        starters: maxStarters,
        formation: storedFormation,
      });
      setAutoFilled(completed.autoFilledIds.length);
      setXi(completed.players.filter((p) => p.is_starting).map((p) => p.player_id));
      setBench(completed.players.filter((p) => !p.is_starting).map((p) => p.player_id));
      const captainFromSheet = completed.players.find((p) => p.is_captain && p.is_starting)?.player_id;
      const squadCaptain = nominated.find((p) => p.is_captain)?.player_id;
      const captainCandidate = captainFromSheet ?? squadCaptain ?? null;
      setCaptainId(
        captainCandidate && completed.players.some((p) => p.is_starting && p.player_id === captainCandidate)
          ? captainCandidate
          : null
      );
      if (lineupJson.lineup?.coach_name) setCoachName(lineupJson.lineup.coach_name);
      else if (defaultCoach) setCoachName(defaultCoach);
      if (lineupJson.lineup?.status) {
        setStatus(lineupJson.lineup.status);
      } else {
        setStatus(defaultLineupStatusForKickoff(scheduledAt));
      }
    } catch {
      setPool([]);
    }
  }, [tournamentId, teamId, matchId, scheduledAt, defaultCoach, maxStarters]);

  useEffect(() => {
    void load();
  }, [load]);

  const unused = pool.filter(
    (p) => !xi.includes(p.player_id) && !bench.includes(p.player_id)
  );

  const warnings = useMemo(() => {
    const players: SheetEntry[] = [
      ...xi.map((id) => ({ player_id: id, is_starting: true, is_captain: captainId === id })),
      ...bench.map((id) => ({ player_id: id, is_starting: false, is_captain: false })),
    ];
    return validateLineupSheet({
      players,
      starters: maxStarters,
      formation: maxStarters === 11 ? formation : null,
      squadIds: new Set(pool.map((p) => p.player_id)),
      suspendedIds: new Set(),
      availability: new Map(pool.map((p) => [p.player_id, normaliseAvailability(p.availability)])),
      mode: "staff",
    }).warnings;
  }, [xi, bench, captainId, formation, pool, maxStarters]);

  function removeFromAll(playerId: string) {
    setXi((prev) => prev.filter((id) => id !== playerId));
    setBench((prev) => prev.filter((id) => id !== playerId));
    setCaptainId((c) => (c === playerId ? null : c));
  }

  function moveTo(playerId: string, zone: Zone) {
    removeFromAll(playerId);
    if (zone === "xi") {
      setXi((prev) => {
        if (prev.includes(playerId)) return prev;
        if (prev.length >= maxStarters) return prev;
        return [...prev, playerId];
      });
    } else if (zone === "bench") {
      setBench((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
    }
  }

  function onDrop(zone: Zone) {
    if (!dragId) return;
    moveTo(dragId, zone);
    setDragId(null);
  }

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    if (xi.length < maxStarters) {
      setError(`Need ${maxStarters} starters (have ${xi.length}).`);
      setBusy(false);
      return;
    }
    const players = [
      ...xi.map((id) => ({
        player_id: id,
        is_starting: true,
        is_captain: captainId === id,
      })),
      ...bench.map((id) => ({
        player_id: id,
        is_starting: false,
        is_captain: false,
      })),
    ];
    try {
      const res = await fetch(`/api/matches/${matchId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          players,
          status,
          coach_name: coachName.trim() || null,
          formation: maxStarters === 11 ? formation : null,
        }),
      });
      const json = (await res.json()) as { error?: string; status?: LineupSheetStatus };
      if (!res.ok) {
        setError(json.error ?? "Could not save lineup");
        return;
      }
      setAutoFilled(0);
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
        {teamName} XI · {xi.length}/{maxStarters} starters · {bench.length} sub
        {bench.length === 1 ? "" : "s"}
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

      {maxStarters === 11 && (
        <label className="block text-xs">
          <span className="font-semibold text-accent/70">Formation</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-2 py-1.5 text-sm"
            value={formation}
            onChange={(e) => setFormation(e.target.value)}
          >
            {FOOTBALL_FORMATIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      )}

      {autoFilled > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {autoFilled} starter{autoFilled === 1 ? " was" : "s were"} filled from the squad to make a full XI.
          Check them, then save.
        </p>
      )}
      {warnings.map((w) => (
        <p key={w} className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {w}
        </p>
      ))}

      <label className="block text-xs">
        <span className="font-semibold text-accent/70">Coach</span>
        <input
          className="mt-1 w-full rounded-lg border border-rule px-2 py-1.5 text-sm"
          value={coachName}
          onChange={(e) => setCoachName(e.target.value)}
          placeholder="Coach name"
        />
      </label>

      <p className="text-[11px] text-accent/55">
        Drag players into Starting XI or Bench. Mark one starter as captain.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <DropZone
          title="Squad pool"
          zone="pool"
          onDrop={() => onDrop("pool")}
          active={Boolean(dragId)}
        >
          {unused.map((p) => (
            <DraggablePlayer
              key={p.player_id}
              player={p}
              dragging={dragId === p.player_id}
              onDragStart={() => setDragId(p.player_id)}
              onDragEnd={() => setDragId(null)}
            />
          ))}
          {unused.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] opacity-50">All named</p>
          )}
        </DropZone>

        <DropZone
          title={`Starting XI (${xi.length}/${maxStarters})`}
          zone="xi"
          onDrop={() => onDrop("xi")}
          active={Boolean(dragId)}
          accent
        >
          {xi.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <DraggablePlayer
                key={id}
                player={p}
                dragging={dragId === id}
                onDragStart={() => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                captain={captainId === id}
                onCaptain={() => setCaptainId(id)}
                onRemove={() => moveTo(id, "pool")}
              />
            );
          })}
          {xi.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] opacity-50">Drop starters here</p>
          )}
        </DropZone>

        <DropZone
          title={`Bench (${bench.length})`}
          zone="bench"
          onDrop={() => onDrop("bench")}
          active={Boolean(dragId)}
        >
          {bench.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <DraggablePlayer
                key={id}
                player={p}
                dragging={dragId === id}
                onDragStart={() => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                onRemove={() => moveTo(id, "pool")}
              />
            );
          })}
          {bench.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] opacity-50">Optional. Subs come from the full squad during the match</p>
          )}
        </DropZone>
      </div>

      <button
        type="button"
        disabled={busy || xi.length < maxStarters}
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

function DropZone({
  title,
  zone,
  children,
  onDrop,
  active,
  accent,
}: {
  title: string;
  zone: Zone;
  children: React.ReactNode;
  onDrop: () => void;
  active: boolean;
  accent?: boolean;
}) {
  return (
    <div
      data-zone={zone}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "min-h-[140px] rounded-lg border border-dashed p-2",
        accent ? "border-accent/40 bg-accent/5" : "border-rule bg-surface/40",
        active && "ring-2 ring-accent/30"
      )}
    >
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-accent/55">
        {title}
      </p>
      <ul className="max-h-52 space-y-1 overflow-y-auto">{children}</ul>
    </div>
  );
}

function DraggablePlayer({
  player,
  dragging,
  onDragStart,
  onDragEnd,
  captain,
  onCaptain,
  onRemove,
}: {
  player: CompetitionRosterPlayer;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  captain?: boolean;
  onCaptain?: () => void;
  onRemove?: () => void;
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", player.player_id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex cursor-grab items-center gap-1.5 rounded-md border border-rule bg-white px-2 py-1.5 text-xs active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <span className="min-w-0 flex-1 truncate font-semibold">
        {player.first_name} {player.last_name}
        {captain ? " (c)" : ""}
      </span>
      {onCaptain && (
        <button
          type="button"
          onClick={onCaptain}
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
            captain ? "btn-filled" : "border border-rule"
          )}
          title="Captain"
        >
          C
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] font-bold text-accent/40 hover:text-accent"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </li>
  );
}
