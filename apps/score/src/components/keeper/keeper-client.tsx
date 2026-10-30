"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Lock, RefreshCw, Trophy, Unlock } from "lucide-react";
import { SportKeeperTabs } from "@/components/admin/image-upload-field";
import { SportKeeper } from "@/components/keeper/sport-keeper";
import {
  isKeeperEventUnlocked,
  type KeeperEvent,
} from "@/lib/keeper/keeper-events-types";
import type { Match } from "@/lib/types/database";
import { dbIdToSport, SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const KEEPER_SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis", "track"];

type Selection =
  | { kind: "fixture"; match: Match; sport: SportId; title: string }
  | { kind: "event"; event: KeeperEvent };

function phaseLabel(phase: string | null | undefined) {
  if (!phase) return null;
  const mw = /^matchweek_(\d+)$/.exec(phase);
  if (mw) return `Matchweek ${mw[1]}`;
  return phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchFixtures(
  sport: SportId | "all"
): Promise<{ fixtures: Match[]; error: string }> {
  try {
    const res = await fetch(`/api/fixtures?sport=${sport}`);
    const json = (await res.json()) as { fixtures?: Match[]; error?: string };
    if (!res.ok) {
      return { fixtures: [], error: json.error ?? "Could not load competition fixtures." };
    }
    return { fixtures: json.fixtures ?? [], error: "" };
  } catch {
    return { fixtures: [], error: "Network error loading competition fixtures." };
  }
}

function formatKickoff(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function KeeperClient({
  canAccess,
  isAdmin,
}: {
  canAccess: boolean;
  isAdmin: boolean;
}) {
  const [events, setEvents] = useState<KeeperEvent[]>([]);
  // null = not loaded yet for the current sport filter
  const [fixtures, setFixtures] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(canAccess);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [fixturesError, setFixturesError] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  // Match resolved for an assigned event, keyed by match id so we know when it's stale
  const [eventMatch, setEventMatch] = useState<{ id: string; match: Match | null } | null>(null);
  const [sportFilter, setSportFilter] = useState<SportId | "all">("all");

  // Assigned calendar events
  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/keeper-events?mine=1");
        const json = (await res.json()) as { events?: KeeperEvent[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "Could not load your assigned events.");
          return;
        }
        if (!cancelled) {
          setEvents(json.events ?? []);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Network error loading assigned events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [canAccess]);

  // Open competition fixtures (no assignment needed)
  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    fetchFixtures(sportFilter).then((result) => {
      if (cancelled) return;
      setFixtures(result.fixtures);
      setFixturesError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [canAccess, sportFilter]);

  const refreshFixtures = () => {
    setRefreshing(true);
    fetchFixtures(sportFilter)
      .then((result) => {
        setFixtures(result.fixtures);
        setFixturesError(result.error);
      })
      .finally(() => setRefreshing(false));
  };

  const changeSport = (id: SportId | "all") => {
    setSportFilter(id);
    setFixtures(null);
  };

  // Resolve the match behind an assigned event, server-side (works for demo + live)
  const eventMatchId = selection?.kind === "event" ? selection.event.match_id : null;
  useEffect(() => {
    if (!eventMatchId) return;
    let cancelled = false;
    fetch(`/api/matches/${eventMatchId}`)
      .then(async (res) => {
        const json = (await res.json()) as { match?: Match };
        if (!cancelled) setEventMatch({ id: eventMatchId, match: res.ok ? (json.match ?? null) : null });
      })
      .catch(() => {
        if (!cancelled) setEventMatch({ id: eventMatchId, match: null });
      });
    return () => {
      cancelled = true;
    };
  }, [eventMatchId]);
  const eventMatchLoading = !!eventMatchId && eventMatch?.id !== eventMatchId;
  const fixturesLoading = fixtures === null;

  const filteredEvents = useMemo(() => {
    const list =
      sportFilter === "all" ? events : events.filter((e) => e.sport_slug === sportFilter);
    return [...list].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }, [events, sportFilter]);

  const fixtureList = fixtures ?? [];
  const liveFixtures = fixtureList.filter((m) => m.status === "live" || m.status === "paused");
  const upcomingFixtures = fixtureList.filter((m) => m.status === "scheduled");

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-display text-lg font-extrabold">Record keeper access required</p>
        <p className="mt-2 text-sm opacity-70">
          Sign in with a Score record keeper or admin account. Events are assigned by an admin.
        </p>
        <Link href="/?auth=signin&next=/keeper" className="btn-primary mt-6 inline-flex rounded-xl px-5 py-3 font-display font-bold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="p-8 text-center text-sm opacity-70">Loading your events…</p>;
  }

  if (selection) {
    const title = selection.kind === "fixture" ? selection.title : selection.event.title;
    const sport: SportId =
      selection.kind === "fixture"
        ? selection.sport
        : ((selection.event.sport_slug as SportId) || "football");
    const match =
      selection.kind === "fixture"
        ? selection.match
        : eventMatch?.id === eventMatchId
          ? eventMatch.match
          : null;
    const unlocked =
      selection.kind === "fixture" ? true : isKeeperEventUnlocked(selection.event.scheduled_at);

    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          type="button"
          onClick={() => setSelection(null)}
          className="mb-4 text-sm font-bold text-accent/70 hover:text-accent"
        >
          ← Back to fixtures
        </button>
        <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-accent/50">
          {title}
        </p>

        {!unlocked ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            This event unlocks on its calendar day.
          </p>
        ) : eventMatchLoading ? (
          <p className="p-8 text-center text-sm opacity-70">Opening match…</p>
        ) : !match ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            This event is unlocked today, but an admin has not linked a match for live scoring yet.
            Ask them to attach a match on the keeper calendar — or pick the fixture directly from
            the competition list.
          </p>
        ) : (
          <SportKeeper key={`${match.id}-${sport}`} match={match} sport={sport} />
        )}
      </div>
    );
  }

  const openFixture = (m: Match) => {
    const sport = dbIdToSport(m.sport_id);
    const title = `${m.tournament?.name ?? "Competition"} · ${m.home_team?.name ?? "Home"} vs ${m.away_team?.name ?? "Away"}`;
    setSelection({ kind: "fixture", match: m, sport, title });
  };

  const renderFixture = (m: Match) => {
    const isLive = m.status === "live" || m.status === "paused";
    const phase = phaseLabel(m.competition_phase);
    return (
      <li key={m.id}>
        <button
          type="button"
          onClick={() => openFixture(m)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-surface"
        >
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">
              {m.home_team?.name ?? "TBD"} <span className="opacity-40">vs</span>{" "}
              {m.away_team?.name ?? "TBD"}
            </p>
            <p className="mt-0.5 truncate text-xs opacity-60">
              {m.tournament?.name ?? "Competition"}
              {phase ? ` · ${phase}` : ""} · {SPORT_LABELS[dbIdToSport(m.sport_id)]} ·{" "}
              {formatKickoff(m.scheduled_at)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
              isLive ? "bg-red-600 text-white" : "btn-filled"
            )}
          >
            {isLive ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
              </>
            ) : (
              "Keep score"
            )}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SportKeeperTabs
        sports={[
          { id: "all", label: "All" },
          ...KEEPER_SPORTS.map((s) => ({ id: s, label: SPORT_LABELS[s] })),
        ]}
        active={sportFilter}
        onChange={(id) => changeSport(id as SportId | "all")}
      />

      {/* Competition fixtures — the main keeper workflow */}
      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
              <Trophy className="h-5 w-5 text-accent" />
              Competition fixtures
            </h2>
            <p className="text-sm opacity-70">
              Open any scheduled league or cup fixture and fill in the details. No calendar
              assignment needed.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshFixtures}
            disabled={fixturesLoading || refreshing}
            className="interactive-btn inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-3 py-1.5 font-display text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (fixturesLoading || refreshing) && "animate-spin")} />
            Refresh
          </button>
        </div>

        {fixturesError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {fixturesError}
          </p>
        )}

        {liveFixtures.length > 0 && (
          <>
            <p className="mt-4 font-display text-[11px] font-bold uppercase tracking-wide text-red-600">
              In progress
            </p>
            <ul className="mt-2 divide-y divide-rule rounded-2xl border border-rule bg-white">
              {liveFixtures.map(renderFixture)}
            </ul>
          </>
        )}

        <p className="mt-4 font-display text-[11px] font-bold uppercase tracking-wide text-accent/60">
          Upcoming
        </p>
        <ul className="mt-2 divide-y divide-rule rounded-2xl border border-rule bg-white">
          {fixturesLoading && (
            <li className="px-4 py-8 text-center text-sm opacity-60">Loading fixtures…</li>
          )}
          {!fixturesLoading && upcomingFixtures.length === 0 && (
            <li className="px-4 py-8 text-center text-sm opacity-60">
              No open competition fixtures{sportFilter !== "all" ? ` for ${SPORT_LABELS[sportFilter]}` : ""}.
              {isAdmin ? (
                <>
                  {" "}
                  <Link
                    href="/admin/competitions"
                    className="font-bold text-accent underline-offset-2 hover:underline"
                  >
                    Create a competition
                  </Link>{" "}
                  to generate fixtures.
                </>
              ) : (
                " Ask an admin to create a competition."
              )}
            </li>
          )}
          {upcomingFixtures.map(renderFixture)}
        </ul>

        {isAdmin && (
          <p className="mt-3 text-xs opacity-60">
            Friendlies and manual results are admin-only — use{" "}
            <Link
              href="/admin/matches"
              className="font-bold text-accent underline-offset-2 hover:underline"
            >
              Admin → Matches
            </Link>
            .
          </p>
        )}
      </section>

      {/* Assigned calendar events — still supported */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <CalendarDays className="h-5 w-5 text-accent" />
          Your assigned events
        </h2>
        <p className="text-sm opacity-70">
          Soonest first. Events unlock on their calendar day only.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <ul className="mt-4 divide-y divide-rule rounded-2xl border border-rule bg-white">
          {filteredEvents.length === 0 && (
            <li className="px-4 py-8 text-center text-sm opacity-60">
              No events assigned. Competition fixtures above are always open to you.
            </li>
          )}
          {filteredEvents.map((e) => {
            const open = isKeeperEventUnlocked(e.scheduled_at);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => {
                    if (!open) return;
                    setSelection({ kind: "event", event: e });
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-4 text-left",
                    open ? "hover:bg-surface" : "cursor-not-allowed opacity-55"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{e.title}</p>
                    <p className="text-xs opacity-60">
                      {SPORT_LABELS[e.sport_slug as SportId] ?? e.sport_slug} ·{" "}
                      {formatKickoff(e.scheduled_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      open ? "btn-filled" : "border border-rule"
                    )}
                  >
                    {open ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {open ? "Open" : "Locked"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
