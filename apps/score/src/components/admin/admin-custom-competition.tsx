"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, X } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ROSTER_UPDATED_EVENT } from "@/lib/roster/parse-roster";
import type { Team, Venue } from "@/lib/types/database";
import { sportToDbId, SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

export const COMPETITION_CREATED_EVENT = "au-score-competition-created";

/** Stored as home/away in DB; campus events treat both as neutral sides. */
type SlotSide = "a" | "b";

type FixtureSlot = {
  key: string;
  /** Left side (DB home_team_id) — not “home advantage” on campus events */
  teamAId: string;
  /** Right side (DB away_team_id) */
  teamBId: string;
  scheduledAt: string;
  venueId: string;
  allowsExtraTime: boolean;
  allowsPenaltyShootout: boolean;
};

function defaultKickoff(offsetHours = 0): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1 + offsetHours);
  return d.toISOString().slice(0, 16);
}

function makeSlots(count: number, prev: FixtureSlot[], defaultVenue: string): FixtureSlot[] {
  const next: FixtureSlot[] = [];
  for (let i = 0; i < count; i++) {
    const existing = prev[i];
    next.push(
      existing ?? {
        key: `fx-${Date.now().toString(36)}-${i}`,
        teamAId: "",
        teamBId: "",
        scheduledAt: defaultKickoff(i),
        venueId: defaultVenue,
        allowsExtraTime: false,
        allowsPenaltyShootout: true,
      }
    );
  }
  return next;
}

/**
 * Fast custom competition: settings → empty fixture boxes → click teams in → publish.
 */
export function AdminCustomCompetition({
  onCreated,
}: {
  onCreated?: (id: string) => void;
} = {}) {
  const { confirm } = useConfirm();
  const [name, setName] = useState("Inter-Faculty Pre-season 2026/27");
  const [season, setSeason] = useState("2026/27");
  const [sport, setSport] = useState<SportId>("football");
  const [fixtureCount, setFixtureCount] = useState(4);
  const [idleCount, setIdleCount] = useState(1);
  const [maxSquadSize, setMaxSquadSize] = useState(25);
  const [maxSubs, setMaxSubs] = useState(9);
  const [rosterPreset, setRosterPreset] = useState<"preseason" | "normal" | "custom">("preseason");
  const [penaltyShootout, setPenaltyShootout] = useState(true);
  const [defaultExtraTime, setDefaultExtraTime] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [defaultVenueId, setDefaultVenueId] = useState("");

  const [slots, setSlots] = useState<FixtureSlot[]>(() => makeSlots(4, [], ""));
  const [idleIds, setIdleIds] = useState<string[]>([""]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [picker, setPicker] = useState<
    | { kind: "fixture"; index: number; side: SlotSide }
    | { kind: "idle"; index: number }
    | null
  >(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTeams = useCallback(async (forSport: SportId) => {
    try {
      const res = await fetch(`/api/roster?sport=${forSport}`);
      const json = (await res.json()) as { teams?: Team[] };
      setTeams(json.teams ?? []);
    } catch {
      setTeams([]);
    }
  }, []);

  const loadVenues = useCallback(async (forSport: SportId) => {
    try {
      const res = await fetch(`/api/venues?sport=${forSport}`);
      const json = (await res.json()) as { venues?: Venue[] };
      const list = (json.venues ?? []).filter((v) => v.is_active && !v.deleted_at);
      setVenues(list);
      setDefaultVenueId((prev) => prev || list[0]?.id || "");
    } catch {
      setVenues([]);
    }
  }, []);

  useEffect(() => {
    void loadTeams(sport);
    void loadVenues(sport);
  }, [sport, loadTeams, loadVenues]);

  useEffect(() => {
    const onUpdated = () => void loadTeams(sport);
    window.addEventListener(ROSTER_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(ROSTER_UPDATED_EVENT, onUpdated);
  }, [sport, loadTeams]);

  useEffect(() => {
    setSlots((prev) => makeSlots(fixtureCount, prev, defaultVenueId));
  }, [fixtureCount, defaultVenueId]);

  useEffect(() => {
    setIdleIds((prev) => {
      const next = prev.slice(0, idleCount);
      while (next.length < idleCount) next.push("");
      return next;
    });
  }, [idleCount]);

  useEffect(() => {
    if (!defaultVenueId) return;
    setSlots((prev) =>
      prev.map((s) => (s.venueId ? s : { ...s, venueId: defaultVenueId }))
    );
  }, [defaultVenueId]);

  const usedIds = useMemo(() => {
    const s = new Set<string>();
    for (const fx of slots) {
      if (fx.teamAId) s.add(fx.teamAId);
      if (fx.teamBId) s.add(fx.teamBId);
    }
    for (const id of idleIds) if (id) s.add(id);
    return s;
  }, [slots, idleIds]);

  const auTeams = useMemo(() => teams.filter((t) => !t.is_guest), [teams]);
  const teamName = useCallback(
    (id: string) => teams.find((t) => t.id === id)?.name ?? "—",
    [teams]
  );

  function assignTeam(teamId: string) {
    if (!picker) return;
    if (picker.kind === "fixture") {
      setSlots((prev) =>
        prev.map((s, i) => {
          if (i !== picker.index) return s;
          const other = picker.side === "a" ? s.teamBId : s.teamAId;
          if (other === teamId) return s;
          return picker.side === "a" ? { ...s, teamAId: teamId } : { ...s, teamBId: teamId };
        })
      );
    } else {
      setIdleIds((prev) => prev.map((id, i) => (i === picker.index ? teamId : id)));
    }
    setPicker(null);
  }

  function clearSlot(target: typeof picker) {
    if (!target) return;
    if (target.kind === "fixture") {
      setSlots((prev) =>
        prev.map((s, i) => {
          if (i !== target.index) return s;
          return target.side === "a" ? { ...s, teamAId: "" } : { ...s, teamBId: "" };
        })
      );
    } else {
      setIdleIds((prev) => prev.map((id, i) => (i === target.index ? "" : id)));
    }
  }

  function swapSides(index: number) {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, teamAId: s.teamBId, teamBId: s.teamAId } : s
      )
    );
  }

  const fixturesReady = slots.every(
    (s) => s.teamAId && s.teamBId && s.teamAId !== s.teamBId && s.scheduledAt && s.venueId
  );
  const idleReady = idleIds.every((id) => Boolean(id));
  const canPublish =
    Boolean(name.trim()) && fixturesReady && (idleCount === 0 || idleReady) && !busy;

  async function handlePublish() {
    setError("");
    setMessage("");
    if (!canPublish) {
      setError("Fill every empty box, kick-off, and venue first.");
      return;
    }

    const teamMap = new Map<string, { id: string; name: string; seed: number }>();
    let seed = 1;
    for (const s of slots) {
      for (const id of [s.teamAId, s.teamBId]) {
        if (!teamMap.has(id)) {
          teamMap.set(id, { id, name: teamName(id), seed: seed++ });
        }
      }
    }
    for (const id of idleIds) {
      if (id && !teamMap.has(id)) {
        teamMap.set(id, { id, name: teamName(id), seed: seed++ });
      }
    }

    const ok = await confirm({
      eyebrow: "Custom competition",
      title: "Publish this competition?",
      body: (
        <>
          <span className="block font-display text-base font-extrabold text-accent">
            “{name.trim()}” · {slots.length} fixtures · {teamMap.size} clubs
          </span>
          <span className="mt-1 block">Fixtures go live for keepers immediately.</span>
        </>
      ),
      confirmLabel: "Publish",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sport_id: sportToDbId(sport),
          competition_type: "event",
          season: season.trim() || "2026/27",
          config: {
            manual_fixtures: true,
            /** Campus events: sides are neutral — no home advantage. */
            sides: "neutral",
            fixture_count: slots.length,
            idle_count: idleIds.filter(Boolean).length,
            max_squad_size: maxSquadSize,
            max_subs: maxSubs,
            starters: Math.max(1, maxSquadSize - maxSubs),
            penalty_shootout: penaltyShootout,
            extra_time: defaultExtraTime,
            roster_preset: rosterPreset,
          },
          is_draft: isDraft,
          teams: [...teamMap.values()],
          pairings: null,
          league_fixtures: null,
          manual_fixtures: slots.map((s) => ({
            home: { id: s.teamAId, name: teamName(s.teamAId) },
            away: { id: s.teamBId, name: teamName(s.teamBId) },
            scheduled_at: new Date(s.scheduledAt).toISOString(),
            venue_id: s.venueId,
            allows_extra_time: s.allowsExtraTime,
            allows_penalty_shootout: s.allowsPenaltyShootout,
          })),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        id?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not create competition");
        return;
      }
      setMessage(json.message ?? "Competition created.");
      if (json.id) {
        onCreated?.(json.id);
        window.dispatchEvent(
          new CustomEvent(COMPETITION_CREATED_EVENT, { detail: { id: json.id } })
        );
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  function TeamBox({
    teamId,
    label,
    onOpen,
  }: {
    teamId: string;
    label: string;
    onOpen: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "min-h-[52px] flex-1 rounded-xl border-2 border-dashed px-3 py-2 text-left transition",
          teamId
            ? "border-accent/40 bg-accent/5 font-display font-bold text-accent"
            : "border-rule bg-white text-accent/45 hover:border-accent/50 hover:text-accent/70"
        )}
      >
        <span className="block text-[10px] font-bold uppercase tracking-wide opacity-50">
          {label}
        </span>
        <span className="block truncate text-sm">{teamId ? teamName(teamId) : "Click to pick club"}</span>
      </button>
    );
  }

  return (
    <div className="table-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Trophy className="h-5 w-5 text-accent" />
        Custom competition
      </h2>
      <p className="mt-1 text-sm opacity-70">
        Set how many matches (and idle clubs), then fill the empty boxes — dates, venues, teams.
        Campus events are <strong>neutral</strong> (no home/away); leagues can still use home sides
        later. One publish creates the whole competition.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold">Name</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Season</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Sport</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={sport}
            onChange={(e) => setSport(e.target.value as SportId)}
          >
            {(Object.keys(SPORT_LABELS) as SportId[]).map((s) => (
              <option key={s} value={s}>
                {SPORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Fixtures</span>
          <input
            type="number"
            min={1}
            max={32}
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={fixtureCount}
            onChange={(e) => setFixtureCount(Math.max(1, Math.min(32, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Idle clubs (not playing)</span>
          <input
            type="number"
            min={0}
            max={16}
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={idleCount}
            onChange={(e) => setIdleCount(Math.max(0, Math.min(16, Number(e.target.value) || 0)))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Roster preset</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={rosterPreset}
            onChange={(e) => {
              const v = e.target.value as "preseason" | "normal" | "custom";
              setRosterPreset(v);
              if (v === "preseason") {
                setMaxSquadSize(25);
                setMaxSubs(9);
              } else if (v === "normal") {
                setMaxSquadSize(22);
                setMaxSubs(9);
              }
            }}
          >
            <option value="preseason">Pre-season · 25 / 9</option>
            <option value="normal">Normal · 22 / 9</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Default venue</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={defaultVenueId}
            onChange={(e) => setDefaultVenueId(e.target.value)}
          >
            <option value="">Select…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        {rosterPreset === "custom" && (
          <>
            <label className="block text-sm">
              <span className="font-semibold">Max squad</span>
              <input
                type="number"
                min={2}
                max={40}
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                value={maxSquadSize}
                onChange={(e) => setMaxSquadSize(Number(e.target.value) || 0)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Max subs</span>
              <input
                type="number"
                min={0}
                max={20}
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                value={maxSubs}
                onChange={(e) => setMaxSubs(Number(e.target.value) || 0)}
              />
            </label>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={defaultExtraTime}
            onChange={(e) => {
              setDefaultExtraTime(e.target.checked);
              setSlots((prev) => prev.map((s) => ({ ...s, allowsExtraTime: e.target.checked })));
            }}
          />
          <span className="font-semibold">Default: extra time if drawn</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={penaltyShootout}
            onChange={(e) => {
              setPenaltyShootout(e.target.checked);
              setSlots((prev) =>
                prev.map((s) => ({ ...s, allowsPenaltyShootout: e.target.checked }))
              );
            }}
          />
          <span className="font-semibold">Default: pens if still level</span>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={isDraft}
            onChange={(e) => setIsDraft(e.target.checked)}
          />
          <span className="font-semibold">Save as draft (hidden from keepers until you clear draft)</span>
        </label>
      </div>

      {venues.length === 0 && (
        <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-sm text-accent">
          Add campus venues below first — fixtures need a location.
        </p>
      )}

      <div className="mt-6 space-y-3">
        <h3 className="font-display text-sm font-extrabold">
          Fixtures · click empty boxes to assign clubs
        </h3>
        {slots.map((slot, index) => (
          <div
            key={slot.key}
            className="rounded-xl border border-rule bg-white/60 p-3 sm:p-4"
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-accent/50">
              Match {index + 1}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <TeamBox
                teamId={slot.teamAId}
                label="Team"
                onOpen={() => setPicker({ kind: "fixture", index, side: "a" })}
              />
              <div className="flex items-center justify-center gap-2 sm:flex-col sm:px-1">
                <span className="font-display text-xs font-bold text-accent/35">vs</span>
                <button
                  type="button"
                  title="Swap sides"
                  onClick={() => swapSides(index)}
                  className="rounded-full border border-rule px-2 py-0.5 text-[10px] font-bold text-accent/55 hover:bg-surface"
                >
                  Swap
                </button>
              </div>
              <TeamBox
                teamId={slot.teamBId}
                label="Team"
                onOpen={() => setPicker({ kind: "fixture", index, side: "b" })}
              />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold">Kick-off</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm"
                  value={slot.scheduledAt}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, scheduledAt: e.target.value } : s
                      )
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Venue</span>
                <select
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm"
                  value={slot.venueId}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, venueId: e.target.value } : s
                      )
                    )
                  }
                >
                  <option value="">Select venue…</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={slot.allowsExtraTime}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, allowsExtraTime: e.target.checked } : s
                      )
                    )
                  }
                />
                <span className="font-semibold">Extra time if drawn</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={slot.allowsPenaltyShootout}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === index
                          ? { ...s, allowsPenaltyShootout: e.target.checked }
                          : s
                      )
                    )
                  }
                />
                <span className="font-semibold">Pens if still level</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {idleCount > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-display text-sm font-extrabold">Sitting out</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {idleIds.map((id, index) => (
              <TeamBox
                key={`idle-${index}`}
                teamId={id}
                label={`Idle ${index + 1}`}
                onOpen={() => setPicker({ kind: "idle", index })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canPublish}
          onClick={() => void handlePublish()}
          className="btn-filled rounded-full px-5 py-2.5 font-display text-sm font-bold disabled:opacity-40"
        >
          {busy ? "Publishing…" : "Publish competition"}
        </button>
        <span className="text-xs text-accent/55">
          {usedIds.size} clubs named · {slots.length} fixtures
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-2 text-sm font-semibold text-emerald-700">{message}</p>}

      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setPicker(null)}
          role="presentation"
        >
          <div
            className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Pick club"
          >
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <p className="font-display font-extrabold">Pick club</p>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="rounded-full p-1 text-accent/60 hover:bg-surface"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-[55vh] overflow-y-auto divide-y divide-rule">
              <li>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm text-accent/60 hover:bg-surface"
                  onClick={() => {
                    clearSlot(picker);
                    setPicker(null);
                  }}
                >
                  Clear slot
                </button>
              </li>
              {auTeams.map((t) => {
                const taken = usedIds.has(t.id);
                const current =
                  picker.kind === "fixture"
                    ? picker.side === "a"
                      ? slots[picker.index]?.teamAId
                      : slots[picker.index]?.teamBId
                    : idleIds[picker.index];
                const isCurrent = current === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={taken && !isCurrent}
                      onClick={() => assignTeam(t.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm font-semibold disabled:opacity-35",
                        isCurrent ? "bg-accent/10 text-accent" : "hover:bg-surface"
                      )}
                    >
                      {t.name}
                      {taken && !isCurrent ? " · already used" : ""}
                    </button>
                  </li>
                );
              })}
              {auTeams.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-accent/60">
                  No clubs onboarded for {SPORT_LABELS[sport]} yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
