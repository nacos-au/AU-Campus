"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Users } from "lucide-react";
import type {
  CompetitionListItem,
  CompetitionRosterPlayer,
  CompetitionTeamRow,
} from "@/lib/data/competition-rosters";
import { AdminLineupLinksPanel } from "@/components/admin/admin-lineup-links-panel";
import { DEFAULT_FORMATION, FOOTBALL_FORMATIONS } from "@/lib/match/lineup-merge";
import { formatPositionsDisplay } from "@/lib/roster/positions";
import { SPORT_LABELS, type SportId, sportToDbId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const inputClass = "mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm";

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "doubtful", label: "Doubtful" },
  { value: "injured", label: "Injured" },
  { value: "unavailable", label: "Unavailable" },
] as const;

export function AdminCompetitionSquadsPanel({
  focusCompetitionId,
  canArchive = false,
}: {
  focusCompetitionId?: string | null;
  /** Admins only — soft-hide competition and soft-delete its matches */
  canArchive?: boolean;
}) {
  const [sport, setSport] = useState<SportId>("football");
  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [competitionId, setCompetitionId] = useState("");
  const [teams, setTeams] = useState<CompetitionTeamRow[]>([]);
  const [active, setActive] = useState<CompetitionListItem | null>(null);
  const [teamId, setTeamId] = useState("");
  const [nominated, setNominated] = useState<CompetitionRosterPlayer[]>([]);
  const [pool, setPool] = useState<CompetitionRosterPlayer[]>([]);
  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [maxSquad, setMaxSquad] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);

  const loadCompetitions = useCallback(async (forSport: SportId) => {
    try {
      const res = await fetch(`/api/competitions?sport=${sportToDbId(forSport)}`);
      const json = (await res.json()) as { competitions?: CompetitionListItem[]; error?: string };
      if (!res.ok) {
        setCompetitions([]);
        return;
      }
      setCompetitions(json.competitions ?? []);
    } catch {
      setCompetitions([]);
    }
  }, []);

  useEffect(() => {
    void loadCompetitions(sport);
  }, [sport, loadCompetitions]);

  useEffect(() => {
    if (focusCompetitionId) {
      setCompetitionId(focusCompetitionId);
    }
  }, [focusCompetitionId]);

  useEffect(() => {
    if (!competitionId && competitions[0]) {
      setCompetitionId(competitions[0].id);
    }
  }, [competitions, competitionId]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setActive(null);
      setTeams([]);
      return;
    }
    try {
      const res = await fetch(`/api/competitions/${id}/roster`);
      const json = (await res.json()) as {
        competition?: CompetitionListItem;
        teams?: CompetitionTeamRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not load competition");
        setActive(null);
        setTeams([]);
        return;
      }
      setActive(json.competition ?? null);
      setTeams(json.teams ?? []);
      setMaxSquad(json.competition?.max_squad_size ?? 25);
      setTeamId((prev) => {
        if (prev && (json.teams ?? []).some((t) => t.team_id === prev)) return prev;
        return json.teams?.[0]?.team_id ?? "";
      });
    } catch {
      setError("Could not load competition");
    }
  }, []);

  useEffect(() => {
    void loadDetail(competitionId);
  }, [competitionId, loadDetail]);

  const loadRoster = useCallback(async (compId: string, sideId: string) => {
    if (!compId || !sideId) {
      setNominated([]);
      setPool([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/competitions/${compId}/roster?teamId=${encodeURIComponent(sideId)}`
      );
      const json = (await res.json()) as {
        nominated?: CompetitionRosterPlayer[];
        pool?: CompetitionRosterPlayer[];
        max_squad_size?: number;
        formation?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not load squad");
        return;
      }
      setNominated(json.nominated ?? []);
      setPool(json.pool ?? []);
      setFormation(json.formation ?? DEFAULT_FORMATION);
      if (json.max_squad_size) setMaxSquad(json.max_squad_size);
    } catch {
      setError("Could not load squad");
    }
  }, []);

  useEffect(() => {
    void loadRoster(competitionId, teamId);
  }, [competitionId, teamId, loadRoster]);

  async function addPlayer(playerId: string) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, player_id: playerId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not add player");
        return;
      }
      setMessage("Added to competition squad.");
      await loadRoster(competitionId, teamId);
      await loadDetail(competitionId);
      await loadCompetitions(sport);
    } catch {
      setError("Could not add player");
    } finally {
      setBusy(false);
    }
  }

  async function patchSquad(body: Record<string, unknown>, okMessage: string) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, ...body }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save");
        return;
      }
      setMessage(okMessage);
      await loadRoster(competitionId, teamId);
    } catch {
      setError("Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function removePlayer(playerId: string) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/roster?playerId=${encodeURIComponent(playerId)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not remove player");
        return;
      }
      setMessage("Removed from competition squad.");
      await loadRoster(competitionId, teamId);
      await loadDetail(competitionId);
      await loadCompetitions(sport);
    } catch {
      setError("Could not remove player");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSelected() {
    if (!canArchive || !competitionId || !active) return;
    const ok = window.confirm(
      `Archive “${active.name}” (${active.season})?\n\nThis soft-hides the competition and soft-deletes all of its matches. Public / keeper lists will stop showing them. You can recreate the competition afterward.`
    );
    if (!ok) return;
    setArchiveBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/competitions/${competitionId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not archive competition");
        return;
      }
      setMessage(json.message ?? "Competition archived.");
      setCompetitionId("");
      setActive(null);
      setTeams([]);
      await loadCompetitions(sport);
    } catch {
      setError("Could not archive competition");
    } finally {
      setArchiveBusy(false);
    }
  }

  const teamRow = teams.find((t) => t.team_id === teamId);

  return (
    <div className="table-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Users className="h-5 w-5 text-accent" />
        Fill competition squads
      </h2>
      <p className="mt-1 text-sm opacity-70">
        Players are registered once under Players (club pool). Here you only select who is
        named for this competition — not a second registration. Cap comes from the competition
        preset (e.g. pre-season 25).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-semibold">Sport</span>
          <select
            className={inputClass}
            value={sport}
            onChange={(e) => {
              setSport(e.target.value as SportId);
              setCompetitionId("");
              setTeamId("");
            }}
          >
            {(Object.keys(SPORT_LABELS) as SportId[]).map((s) => (
              <option key={s} value={s}>
                {SPORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold">Competition</span>
          <select
            className={inputClass}
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
          >
            {competitions.length === 0 && <option value="">No competitions yet</option>}
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.season} · {c.roster_count} named / max {c.max_squad_size} per side
              </option>
            ))}
          </select>
        </label>
      </div>

      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-accent/5 px-3 py-2 text-sm text-accent">
          <p className="min-w-0 flex-1">
            <span className="font-display font-bold">{active.name}</span>
            {" · "}
            max squad {active.max_squad_size} · max subs {active.max_subs}
            {" · "}
            {active.team_count} clubs
          </p>
          {canArchive && (
            <button
              type="button"
              disabled={archiveBusy}
              onClick={() => void archiveSelected()}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {archiveBusy ? "Archiving…" : "Archive competition"}
            </button>
          )}
        </div>
      )}

      {teams.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {teams.map((t) => (
            <button
              key={t.team_id}
              type="button"
              onClick={() => setTeamId(t.team_id)}
              className={cn(
                "rounded-full px-3 py-1.5 font-display text-xs font-bold",
                teamId === t.team_id ? "btn-filled" : "border border-rule bg-white text-accent/70"
              )}
            >
              {t.team_name}{" "}
              <span className="opacity-70">
                {t.roster_count}/{maxSquad}
              </span>
            </button>
          ))}
        </div>
      )}

      {teamRow && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-extrabold">
                Competition squad · {teamRow.roster_count}/{maxSquad}
              </h3>
              {sport === "football" && (
                <label className="flex items-center gap-2 text-xs font-semibold">
                  Formation
                  <select
                    aria-label="Team formation"
                    className="rounded border border-rule px-2 py-1 text-xs"
                    value={formation}
                    disabled={busy}
                    onChange={(e) =>
                      void patchSquad({ formation: e.target.value }, `Formation set to ${e.target.value}.`)
                    }
                  >
                    {FOOTBALL_FORMATIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <ul className="mt-2 divide-y divide-rule rounded-lg border border-rule">
              {nominated.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-accent/60">
                  No players nominated yet — add from the club pool.
                </li>
              ) : (
                nominated.map((p) => (
                  <li key={p.player_id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {p.first_name} {p.last_name}
                        {p.is_captain && (
                          <span className="ml-1 rounded bg-accent/10 px-1 text-[10px] font-bold text-accent">
                            C
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-accent/55">
                        {formatPositionsDisplay(p.position) || "—"}
                        {p.matric_number ? ` · ${p.matric_number}` : ""}
                      </p>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-accent/70">
                      #
                      <input
                        aria-label={`Jersey for ${p.first_name} ${p.last_name}`}
                        className="w-14 rounded border border-rule px-1.5 py-0.5 text-xs"
                        inputMode="numeric"
                        defaultValue={p.jersey_number ?? ""}
                        disabled={busy}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === "" ? null : Number(raw);
                          if (next === p.jersey_number) return;
                          if (next !== null && (!Number.isInteger(next) || next < 1 || next > 99)) {
                            setError("Jersey number must be between 1 and 99.");
                            e.target.value = String(p.jersey_number ?? "");
                            return;
                          }
                          void patchSquad(
                            { player_id: p.player_id, jersey_number: next },
                            "Jersey saved."
                          );
                        }}
                      />
                    </label>
                    <select
                      aria-label={`Availability for ${p.first_name} ${p.last_name}`}
                      className="rounded border border-rule px-1.5 py-0.5 text-xs"
                      value={p.availability}
                      disabled={busy}
                      onChange={(e) =>
                        void patchSquad(
                          { player_id: p.player_id, availability: e.target.value },
                          "Availability saved."
                        )
                      }
                    >
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      title="Set as captain"
                      onClick={() =>
                        void patchSquad(
                          { player_id: p.player_id, is_captain: true },
                          `${p.first_name} ${p.last_name} is captain.`
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold disabled:opacity-40",
                        p.is_captain ? "border-accent bg-accent/10 text-accent" : "border-rule text-accent/70"
                      )}
                    >
                      <Star className="h-3 w-3" />
                      Captain
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removePlayer(p.player_id)}
                      className="rounded-full border border-rule px-2.5 py-1 text-xs font-bold text-accent/70 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-extrabold">Club pool (not yet nominated)</h3>
            <ul className="mt-2 max-h-80 divide-y divide-rule overflow-y-auto rounded-lg border border-rule">
              {pool.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-accent/60">
                  Empty pool — register players under Players, then come back.
                </li>
              ) : (
                pool.map((p) => (
                  <li key={p.player_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="truncate text-xs text-accent/55">
                        {formatPositionsDisplay(p.position) || "—"}
                        {p.matric_number ? ` · ${p.matric_number}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy || nominated.length >= maxSquad}
                      onClick={() => void addPlayer(p.player_id)}
                      className="btn-filled rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-40"
                    >
                      Add
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm text-accent/80">{message}</p>}

      {competitionId && active && (
        <AdminLineupLinksPanel key={competitionId} competitionId={competitionId} />
      )}
    </div>
  );
}
