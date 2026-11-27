"use client";

import { useMemo, useState, useEffect } from "react";
import type { LineupLinkContext } from "@/lib/data/lineup-links";
import {
  FOOTBALL_FORMATIONS,
  completeStartingXi,
  type PoolPlayer,
  type SheetEntry,
} from "@/lib/match/lineup-merge";
import { validateLineupSheet } from "@/lib/match/lineup-validate";
import { describeCutoff, isSubmissionClosed } from "@/lib/lineup-links/cutoff";
import { cn } from "@/lib/utils/cn";

type Slot = "start" | "bench" | "out";

const inputClass = "mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function countdown(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** Predicted XI from the squad. Pinned players (already in the XI) are kept. */
function predictXi(
  squad: LineupLinkContext["squad"],
  slots: Record<string, Slot>,
  starters: number,
  formation: string,
  keepPins: boolean
): Record<string, Slot> {
  const pool: PoolPlayer[] = squad
    .filter((p) => p.availability === "available" && slots[p.player_id] !== "out")
    .map((p) => ({
      player_id: p.player_id,
      position: p.position,
      jersey_number: p.jersey_number,
      available: true,
    }));

  const sheet: SheetEntry[] = [];
  if (keepPins) {
    for (const [playerId, slot] of Object.entries(slots)) {
      if (slot === "start") sheet.push({ player_id: playerId, is_starting: true });
      if (slot === "bench") sheet.push({ player_id: playerId, is_starting: false });
    }
  }

  const result = completeStartingXi({ sheet, pool, starters, formation });
  const next: Record<string, Slot> = {};
  for (const entry of result.players) {
    next[entry.player_id] = entry.is_starting ? "start" : "bench";
  }
  return next;
}

export function RepLineupForm({ token, context }: { token: string; context: LineupLinkContext }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const openMatches = context.matches.filter((m) => !m.closed);
  const [matchId, setMatchId] = useState(openMatches[0]?.id ?? context.matches[0]?.id ?? "");
  const [formation, setFormation] = useState(context.formation);
  const [slots, setSlots] = useState<Record<string, Slot>>(() =>
    predictXi(context.squad, {}, context.starters, context.formation, false)
  );
  const [captainId, setCaptainId] = useState<string>(() => {
    const preset = context.squad.find((p) => p.is_captain);
    return preset ? preset.player_id : "";
  });
  const [coachName, setCoachName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ match: string } | null>(null);

  const isFootball = context.starters === 11;
  const match = context.matches.find((m) => m.id === matchId);
  const closed = match ? isSubmissionClosed(match.scheduled_at, context.cutoff_minutes, new Date(now)) : true;
  const cutoffMs = match ? new Date(match.cutoff_at).getTime() - now : 0;

  const squadSorted = useMemo(
    () =>
      [...context.squad].sort(
        (a, b) =>
          (a.jersey_number ?? 999) - (b.jersey_number ?? 999) ||
          a.last_name.localeCompare(b.last_name)
      ),
    [context.squad]
  );

  const starterCount = Object.values(slots).filter((s) => s === "start").length;
  const benchCount = Object.values(slots).filter((s) => s === "bench").length;

  function setSlot(playerId: string, slot: Slot) {
    setSlots((prev) => {
      const next = { ...prev, [playerId]: slot };
      if (slot !== "start" && captainId === playerId) setCaptainId("");
      return next;
    });
  }

  function changeFormation(next: string) {
    setFormation(next);
    setSlots((prev) => {
      const filled = predictXi(context.squad, prev, context.starters, next, true);
      // Keep manual "out" choices as they were.
      for (const p of context.squad) {
        if (prev[p.player_id] === "out") filled[p.player_id] = "out";
      }
      return filled;
    });
  }

  function resetPrediction() {
    setSlots(predictXi(context.squad, {}, context.starters, formation, false));
    setCaptainId("");
  }

  function buildPlayers(): SheetEntry[] {
    return squadSorted
      .filter((p) => slots[p.player_id] === "start" || slots[p.player_id] === "bench")
      .map((p) => ({
        player_id: p.player_id,
        is_starting: slots[p.player_id] === "start",
        role: p.position,
        is_captain: p.player_id === captainId,
        jersey_number: p.jersey_number,
      }));
  }

  function validate(players: SheetEntry[]) {
    return validateLineupSheet({
      players,
      starters: context.starters,
      formation: isFootball ? formation : null,
      squadIds: new Set(context.squad.map((p) => p.player_id)),
      suspendedIds: new Set(),
      availability: new Map(context.squad.map((p) => [p.player_id, p.availability] as const)),
      mode: "rep",
    });
  }

  async function submit() {
    setErrors([]);
    setWarnings([]);
    if (!match) {
      setErrors(["Pick a match first."]);
      return;
    }
    if (closed) {
      setErrors(["Submissions for this match are closed."]);
      return;
    }
    const players = buildPlayers();
    const check = validate(players);
    if (check.errors.length) {
      setErrors(check.errors);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/lineup-links/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          match_id: matchId,
          players,
          formation: isFootball ? formation : null,
          coach_name: coachName.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: string[];
        warnings?: string[];
      };
      if (!res.ok) {
        setErrors(json.errors?.length ? json.errors : [json.error ?? "Could not send the XI."]);
        return;
      }
      setWarnings(json.warnings ?? []);
      setReceipt({ match: `${context.team.name} vs ${match.opponent}` });
    } catch {
      setErrors(["Could not send the XI. Check your connection and try again."]);
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <div className="table-card p-6 text-center">
        <h2 className="font-display text-xl font-extrabold">XI received</h2>
        <p className="mt-2 text-sm text-accent/80">
          Your starting XI for {receipt.match} is pending staff approval. It goes live on the
          match once an admin approves it.
        </p>
        <p className="mt-2 text-sm text-accent/60">
          You can send an updated XI for the same match until the cut-off. Each new send replaces
          the one before.
        </p>
        <button
          type="button"
          onClick={() => setReceipt(null)}
          className="btn-filled mt-4 rounded-full px-4 py-2 text-sm font-bold"
        >
          Send another XI
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="table-card p-6">
        <h2 className="font-display text-lg font-extrabold">{context.competition.name}</h2>
        <p className="text-sm text-accent/70">
          {context.team.name} · {context.competition.season}
        </p>
        <p className="mt-2 text-sm text-accent/70">
          Submit the starting XI and bench. Staff check it before it goes live. No account needed.
        </p>
      </section>

      <section className="table-card space-y-4 p-6">
        <label className="block text-sm">
          <span className="font-semibold">Match</span>
          <select
            className={inputClass}
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
          >
            {context.matches.length === 0 && <option value="">No upcoming matches</option>}
            {context.matches.map((m) => (
              <option key={m.id} value={m.id}>
                {formatKickoff(m.scheduled_at)} · {m.home ? "vs" : "@"} {m.opponent}
                {m.closed ? " (closed)" : ""}
              </option>
            ))}
          </select>
        </label>

        {match && (
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              closed ? "bg-red-50 text-red-700" : "bg-accent/5 text-accent"
            )}
          >
            {closed ? (
              <>Submissions closed at {formatKickoff(match.cutoff_at)}.</>
            ) : (
              <>
                Closes {formatKickoff(match.cutoff_at)} ({describeCutoff(context.cutoff_minutes)})
                {" · "}
                {countdown(cutoffMs)} left
              </>
            )}
            {match.pending && (
              <span className="block pt-1 text-xs opacity-80">
                A XI for this match is already pending. Sending again replaces it.
              </span>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {isFootball && (
            <label className="block text-sm">
              <span className="font-semibold">Formation</span>
              <select
                className={inputClass}
                value={formation}
                onChange={(e) => changeFormation(e.target.value)}
              >
                {FOOTBALL_FORMATIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="font-semibold">Coach or manager (optional)</span>
            <input
              className={inputClass}
              value={coachName}
              maxLength={120}
              onChange={(e) => setCoachName(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-accent/10 px-3 py-1 font-semibold text-accent">
            Starters {starterCount}/{context.starters}
          </span>
          <span className="rounded-full bg-accent/10 px-3 py-1 font-semibold text-accent">
            Bench {benchCount}
          </span>
          <button
            type="button"
            onClick={resetPrediction}
            className="rounded-full border border-rule px-3 py-1 text-xs font-bold text-accent/80"
          >
            Reset to predicted XI
          </button>
        </div>
      </section>

      <section className="table-card p-6">
        <h3 className="font-display text-sm font-extrabold">Squad</h3>
        <p className="mt-1 text-xs text-accent/60">
          Pick Starter or Bench, then choose one captain from the starters. Injured or unavailable
          players cannot be named.
        </p>
        <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule">
          {squadSorted.map((p) => {
            const slot = slots[p.player_id] ?? "out";
            const unavailable = p.availability !== "available";
            return (
              <li key={p.player_id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.first_name} {p.last_name}
                    {p.jersey_number != null && (
                      <span className="ml-1 font-mono text-xs text-accent/50">#{p.jersey_number}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-accent/55">
                    {p.position || "—"}
                    {unavailable && (
                      <span className="ml-2 font-semibold text-red-600">{p.availability}</span>
                    )}
                  </p>
                </div>
                <select
                  aria-label={`Select for ${p.first_name} ${p.last_name}`}
                  className="rounded-lg border border-rule px-2 py-1 text-xs"
                  value={slot}
                  onChange={(e) => setSlot(p.player_id, e.target.value as Slot)}
                >
                  <option value="start" disabled={unavailable}>
                    Starter
                  </option>
                  <option value="bench" disabled={unavailable}>
                    Bench
                  </option>
                  <option value="out">Not named</option>
                </select>
                <label className="flex items-center gap-1 text-xs font-semibold text-accent/80">
                  <input
                    type="radio"
                    name="captain"
                    checked={captainId === p.player_id}
                    disabled={slot !== "start"}
                    onChange={() => setCaptainId(p.player_id)}
                  />
                  Captain
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {errors.length > 0 && (
        <ul className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={busy || closed || !match}
        onClick={() => void submit()}
        className="btn-filled w-full rounded-full px-4 py-3 font-display text-sm font-bold disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send starting XI for approval"}
      </button>
    </div>
  );
}
