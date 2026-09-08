"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import { SportKeeperTabs } from "@/components/admin/image-upload-field";
import { AdminPostResultTool } from "@/components/admin/admin-post-result-tool";
import { SportKeeper } from "@/components/keeper/sport-keeper";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import {
  isKeeperEventUnlocked,
  type KeeperEvent,
} from "@/lib/keeper/keeper-events-types";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const KEEPER_SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis", "track"];

export function KeeperClient({
  canAccess,
  isAdmin,
}: {
  canAccess: boolean;
  isAdmin: boolean;
}) {
  const [events, setEvents] = useState<KeeperEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "manual">("live");
  const [sportFilter, setSportFilter] = useState<SportId | "all">("all");

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
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

  const filtered = useMemo(() => {
    const list =
      sportFilter === "all"
        ? events
        : events.filter((e) => e.sport_slug === sportFilter);
    return [...list].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }, [events, sportFilter]);

  const selected = filtered.find((e) => e.id === selectedId) ?? null;
  const unlocked = selected ? isKeeperEventUnlocked(selected.scheduled_at) : false;
  const sport = (selected?.sport_slug as SportId) || "football";
  const matches = useMemo(() => listAllDemoMatches(), []);
  const match =
    selected?.match_id
      ? matches.find((m) => m.id === selected.match_id)
      : null;

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

  if (selected && unlocked) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="mb-4 text-sm font-bold text-accent/70 hover:text-accent"
        >
          ← Back to assigned events
        </button>
        <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-accent/50">
          {selected.title}
        </p>

        {isAdmin && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("live")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-display text-sm font-bold",
                mode === "live" ? "btn-filled bg-accent text-white" : "border border-rule"
              )}
            >
              Live keeper
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-display text-sm font-bold",
                mode === "manual" ? "btn-filled bg-accent text-white" : "border border-rule"
              )}
            >
              Post result
            </button>
          </div>
        )}

        {mode === "manual" && isAdmin ? (
          <AdminPostResultTool />
        ) : !match ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            This event is unlocked today, but an admin has not linked a match for live scoring yet.
            Ask them to attach a match_id on the calendar event.
          </p>
        ) : (
          <SportKeeper key={`${match.id}-${sport}`} match={match} sport={sport} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SportKeeperTabs
        sports={[
          { id: "all", label: "All" },
          ...KEEPER_SPORTS.map((s) => ({ id: s, label: SPORT_LABELS[s] })),
        ]}
        active={sportFilter}
        onChange={(id) => setSportFilter(id as SportId | "all")}
      />

      <h2 className="mt-6 font-display text-lg font-extrabold">Your assigned events</h2>
      <p className="text-sm opacity-70">
        Soonest first. Events unlock on their calendar day only.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-rule rounded-2xl border border-rule bg-white">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm opacity-60">
            No events assigned yet. An admin must add you on the keeper calendar.
          </li>
        )}
        {filtered.map((e) => {
          const open = isKeeperEventUnlocked(e.scheduled_at);
          return (
            <li key={e.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => open && setSelectedId(e.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-4 text-left",
                  open ? "hover:bg-surface" : "cursor-not-allowed opacity-55"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold">{e.title}</p>
                  <p className="text-xs opacity-60">
                    {SPORT_LABELS[e.sport_slug as SportId] ?? e.sport_slug} ·{" "}
                    {new Date(e.scheduled_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    open ? "btn-filled bg-accent text-white" : "border border-rule"
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
    </div>
  );
}
