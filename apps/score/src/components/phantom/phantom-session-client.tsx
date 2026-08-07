"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import {
  advancePeriod,
  completeMatch,
  concludeSession,
  logGoal,
  logPenalty,
  teamName,
} from "@/lib/phantom/engine";
import {
  flushPhantomClock,
  livePhantomElapsed,
  pausePhantomClock,
  readPhantomClock,
  resetPhantomClock,
  startPhantomClock,
  writePhantomClock,
  type PhantomClockState,
} from "@/lib/phantom/clock";
import {
  getPhantomSessionLocal,
  savePhantomSessionLocal,
} from "@/lib/phantom/store";
import { PHANTOM_BRAND, type PhantomSession } from "@/lib/phantom/types";
import { cn } from "@/lib/utils/cn";

export function PhantomSessionClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PhantomSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [scorerTeamId, setScorerTeamId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [assistName, setAssistName] = useState("");
  const [clock, setClock] = useState<PhantomClockState>(() => readPhantomClock(sessionId));
  const [deviceOnlySave, setDeviceOnlySave] = useState(false);
  const [, setTick] = useState(0);

  const elapsed = livePhantomElapsed(clock);
  const clockOn = clock.clockOn;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = getPhantomSessionLocal(sessionId);
      if (local) {
        if (!cancelled) {
          setSession(local);
          setClock(readPhantomClock(sessionId));
          setLoading(false);
        }
      }

      try {
        const res = await fetch(`/api/phantom/${sessionId}`);
        if (res.ok) {
          const json = (await res.json()) as { session?: PhantomSession };
          if (json.session && !cancelled) {
            setSession(json.session);
            savePhantomSessionLocal(json.session);
          }
        } else if (!local && !cancelled) {
          setSession(null);
        }
      } catch {
        /* keep local */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const activeMatch = useMemo(
    () =>
      session?.matches.find((m) => m.id === session.active_match_id) ??
      session?.matches.find((m) => m.status === "live"),
    [session]
  );

  const needsClock =
    session?.settings.scoring_mode === "timed" || session?.settings.format === "sets";
  const paused = Boolean(needsClock && !clockOn && session && session.status !== "completed");

  const persist = useCallback(async (next: PhantomSession) => {
    setSession(next);
    savePhantomSessionLocal(next);
    try {
      const res = await fetch(`/api/phantom/${next.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: next }),
      });
      if (!res.ok) {
        setDeviceOnlySave(true);
        return;
      }
      setDeviceOnlySave(false);
    } catch {
      setDeviceOnlySave(true);
    }
  }, []);

  const setClockState = useCallback(
    (next: PhantomClockState) => {
      setClock(next);
      writePhantomClock(sessionId, next);
    },
    [sessionId]
  );

  useEffect(() => {
    if (!clockOn || !session || !needsClock) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [clockOn, session, needsClock]);

  useEffect(() => {
    if (!session || session.settings.format !== "sets" || !activeMatch || !clockOn) return;
    const limit = (session.settings.set_duration_minutes ?? 10) * 60;
    if (elapsed >= limit) {
      setClockState(resetPhantomClock());
      void persist(advancePeriod(session, activeMatch.id));
    }
  }, [elapsed, session, activeMatch, clockOn, persist, setClockState]);

  useEffect(() => {
    const flush = () => {
      setClock((prev) => {
        const next = flushPhantomClock(prev);
        writePhantomClock(sessionId, next);
        const local = getPhantomSessionLocal(sessionId);
        if (local) savePhantomSessionLocal(local);
        return next;
      });
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, [sessionId]);

  function clockLabel() {
    if (!session || !needsClock) return "—";
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function handleGoal() {
    if (!session || !activeMatch || !scorerTeamId || !playerName.trim()) return;
    if (needsClock && !clockOn) return;
    const next = logGoal(
      session,
      activeMatch.id,
      scorerTeamId,
      playerName,
      session.settings.track_assists ? assistName : null,
      clockLabel()
    );
    setPlayerName("");
    setAssistName("");
    setScorerTeamId(null);
    setClockState(resetPhantomClock());
    await persist(next);
  }

  function share() {
    if (!session) return;
    window.location.href = `${PHANTOM_BRAND.path}/${session.id}/share`;
  }

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm opacity-60">Loading Phantom…</p>;
  }

  if (!session) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">Phantom not found</p>
        <Link href={PHANTOM_BRAND.path} className="mt-3 inline-block text-sm font-bold text-accent hover:underline">
          Start a new session
        </Link>
      </div>
    );
  }

  const home = activeMatch ? teamName(session, activeMatch.home_team_id) : "";
  const away = activeMatch ? teamName(session, activeMatch.away_team_id) : "";
  const concluded = session.status === "completed";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
            <PhantomIcon size={22} className="text-white" />
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-accent/50">
              {PHANTOM_BRAND.name} · {session.code}
            </p>
            <h1 className="font-display text-2xl font-extrabold text-accent">{session.title}</h1>
            <p className="text-sm text-accent/60">
              {session.settings.format.replace("_", " ")} · {session.settings.sport}
              {concluded ? " · Final" : " · Live"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-2 rounded-full border border-rule px-4 py-2 font-display text-xs font-bold"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {deviceOnlySave && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          Saved on this device. Cloud sync failed — keep this browser open or check your connection before sharing across phones.
        </p>
      )}

      {concluded ? (
        <ResultsView session={session} />
      ) : activeMatch ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-rule bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-accent/50">
              <span>
                {session.settings.period_label} {activeMatch.current_period}
                {session.settings.scoring_mode === "timed" &&
                  ` · ${session.settings.period_minutes}:00`}
              </span>
              <span>
                Match {activeMatch.index + 1}/{session.matches.length}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <p className="truncate text-right font-display text-lg font-extrabold">{home}</p>
              <p className="font-display text-4xl font-extrabold tabular-nums">
                {session.settings.scoring_mode === "penalties"
                  ? `${activeMatch.home_penalties ?? 0}–${activeMatch.away_penalties ?? 0}`
                  : `${activeMatch.home_score}–${activeMatch.away_score}`}
              </p>
              <p className="truncate font-display text-lg font-extrabold">{away}</p>
            </div>

            {session.settings.format === "sets" && (
              <p className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-accent/50">
                Set {activeMatch.set_number ?? activeMatch.index + 1} · table = sets won
              </p>
            )}

            {needsClock && (
              <div
                className={cn(
                  "mt-4 rounded-xl px-4 py-4 text-center",
                  paused ? "bg-accent text-white" : "bg-surface"
                )}
              >
                <p
                  className={cn(
                    "font-display tabular-nums font-extrabold",
                    paused ? "btn-filled text-5xl text-white" : "text-3xl text-accent"
                  )}
                >
                  {clockLabel()}
                </p>
                {paused && (
                  <p className="btn-filled mt-2 font-display text-sm font-extrabold uppercase tracking-[0.2em] text-white">
                    Paused — resume before logging goals
                  </p>
                )}
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setClockState(clockOn ? pausePhantomClock(clock) : startPhantomClock(clock))
                    }
                    className={cn(
                      "rounded-lg px-4 py-2 text-xs font-bold",
                      paused
                        ? "btn-filled bg-white text-accent"
                        : "border border-rule bg-white"
                    )}
                  >
                    {clockOn ? "Pause" : "Resume / Start clock"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setClockState(resetPhantomClock())}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-bold",
                      paused ? "border-white/40 text-white" : "border-rule"
                    )}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {session.settings.scoring_mode === "penalties" ? (
            <PenaltyPad
              homeId={activeMatch.home_team_id}
              awayId={activeMatch.away_team_id}
              homeName={home}
              awayName={away}
              onKick={async (teamId, scored, name) => {
                await persist(logPenalty(session, activeMatch.id, teamId, name, scored));
              }}
            />
          ) : (
            <div className="rounded-2xl border border-rule bg-white p-5">
              <p className="mb-3 font-display text-sm font-extrabold">
                {session.settings.format === "sets" ? "Log goal (ends set at target)" : "Log goal"}
              </p>
              {paused && (
                <p className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs font-semibold text-accent">
                  Clock is paused. Resume the clock before logging goals.
                </p>
              )}
              <div className="mb-3 flex gap-2">
                {[
                  { id: activeMatch.home_team_id, label: home },
                  { id: activeMatch.away_team_id, label: away },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={paused}
                    onClick={() => setScorerTeamId(t.id)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 font-display text-sm font-bold disabled:opacity-40",
                      scorerTeamId === t.id
                        ? "btn-filled border-accent bg-accent text-white"
                        : "border-rule"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-semibold">Scorer</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2 disabled:opacity-40"
                    value={playerName}
                    disabled={paused}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Name"
                  />
                </label>
                {session.settings.track_assists && (
                  <label className="block text-sm">
                    <span className="font-semibold">Assist</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-rule px-3 py-2 disabled:opacity-40"
                      value={assistName}
                      disabled={paused}
                      onChange={(e) => setAssistName(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                )}
              </div>
              <button
                type="button"
                disabled={paused || !scorerTeamId || !playerName.trim()}
                onClick={handleGoal}
                className="btn-primary mt-4 w-full rounded-xl py-3 font-display font-extrabold text-white disabled:opacity-40"
              >
                Confirm goal
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {session.settings.format === "sets" && (
              <button
                type="button"
                onClick={() => {
                  setClockState(resetPhantomClock());
                  void persist(advancePeriod(session, activeMatch.id));
                }}
                className="rounded-lg border border-rule px-4 py-2 text-sm font-bold"
              >
                Time draw — both leave
              </button>
            )}
            {session.settings.scoring_mode === "timed" && session.settings.format !== "sets" && (
              <button
                type="button"
                onClick={() => {
                  setClockState(resetPhantomClock());
                  void persist(advancePeriod(session, activeMatch.id));
                }}
                className="rounded-lg border border-rule px-4 py-2 text-sm font-bold"
              >
                End {session.settings.period_label.toLowerCase()}
              </button>
            )}
            {session.settings.format !== "sets" && (
              <button
                type="button"
                onClick={() => {
                  setClockState(resetPhantomClock());
                  void persist(completeMatch(session, activeMatch.id));
                }}
                className="rounded-lg border border-rule px-4 py-2 text-sm font-bold"
              >
                End match
              </button>
            )}
            <button
              type="button"
              onClick={() => persist(concludeSession(session))}
              className="rounded-lg border border-accent px-4 py-2 text-sm font-bold text-accent"
            >
              Conclude Phantom
            </button>
          </div>

          <EventFeed session={session} />
        </div>
      ) : (
        <ResultsView session={session} />
      )}
    </div>
  );
}

function PenaltyPad({
  homeId,
  awayId,
  homeName,
  awayName,
  onKick,
}: {
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  onKick: (teamId: string, scored: boolean, name: string) => void;
}) {
  const [teamId, setTeamId] = useState(homeId);
  const [name, setName] = useState("");

  return (
    <div className="rounded-2xl border border-rule bg-white p-5">
      <p className="mb-3 font-display text-sm font-extrabold">Penalty kick</p>
      <div className="mb-3 flex gap-2">
        {[
          { id: homeId, label: homeName },
          { id: awayId, label: awayName },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTeamId(t.id)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 font-display text-sm font-bold",
              teamId === t.id ? "btn-filled border-accent bg-accent text-white" : "border-rule"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        className="mb-3 w-full rounded-lg border border-rule px-3 py-2 text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Taker name"
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="btn-filled rounded-xl bg-accent py-3 font-display font-extrabold text-white"
          onClick={() => {
            onKick(teamId, true, name || "Unknown");
            setName("");
          }}
        >
          Scored
        </button>
        <button
          type="button"
          className="rounded-xl border border-rule py-3 font-display font-extrabold"
          onClick={() => {
            onKick(teamId, false, name || "Unknown");
            setName("");
          }}
        >
          Missed
        </button>
      </div>
    </div>
  );
}

function EventFeed({ session }: { session: PhantomSession }) {
  if (session.events.length === 0) {
    return <p className="text-center text-sm opacity-50">Goals and names appear here as you log them.</p>;
  }
  return (
    <ul className="divide-y divide-rule rounded-2xl border border-rule bg-white">
      {session.events.slice(0, 20).map((ev) => (
        <li key={ev.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div>
            <p className="font-display font-bold">
              {ev.player_name}
              {ev.assist_name ? (
                <span className="font-semibold text-accent/60"> · assist {ev.assist_name}</span>
              ) : null}
            </p>
            <p className="text-xs opacity-50">
              {teamName(session, ev.team_id)} · {ev.type.replace("_", " ")}
            </p>
          </div>
          <span className="tabular-nums text-xs font-bold opacity-60">{ev.clock_label}</span>
        </li>
      ))}
    </ul>
  );
}

function ResultsView({ session }: { session: PhantomSession }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-rule bg-white p-6 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent/50">
          Final Phantom
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">{session.title}</h2>
        <p className="mt-1 text-sm opacity-60">Share code {session.code}</p>
        <Link
          href={`${PHANTOM_BRAND.path}/${session.id}/share`}
          className="btn-filled mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white"
        >
          <Share2 className="h-4 w-4" />
          Open share preview
        </Link>
      </div>

      <div>
        <h3 className="mb-3 font-display text-lg font-extrabold">
          {session.settings.format === "mini_league" ? "Table" : "Top teams"}
        </h3>
        <ul className="divide-y divide-rule rounded-2xl border border-rule bg-white">
          {session.standings.map((row, i) => (
            <li key={row.team_id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 font-display text-sm font-extrabold opacity-40">{i + 1}</span>
              <span className="flex-1 font-display font-bold">{row.team_name}</span>
              <span className="text-sm tabular-nums opacity-70">
                {row.goals_for}:{row.goals_against}
              </span>
              <span className="w-8 text-right font-display font-extrabold">{row.points}</span>
            </li>
          ))}
        </ul>
      </div>

      <EventFeed session={session} />

      <Link
        href={PHANTOM_BRAND.path}
        className="btn-primary inline-flex rounded-xl px-5 py-3 font-display font-extrabold text-white"
      >
        New Phantom
      </Link>
    </div>
  );
}
