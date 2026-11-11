"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VenueSelect } from "@/components/admin/venue-select";
import { AdminMatchLineupPanel } from "@/components/admin/admin-match-lineup-panel";
import type { Match } from "@/lib/types/database";
import { dbIdToSport, SPORT_LABELS, type SportId } from "@/lib/utils/sport";

type EditableMatch = {
  id: string;
  label: string;
  sport: SportId;
  venue_id: string;
  home_score: number;
  away_score: number;
  status: string;
  scheduled_at: string;
  tournament_id: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  referee_name: string;
  assistant_referee_1: string;
  assistant_referee_2: string;
  postpone_reason: string;
};

type StatusOption = "scheduled" | "live" | "completed" | "postponed";

/**
 * Edit / soft-delete existing fixtures — venue, scores, status, lineups.
 * Available to admin and record keepers via the same APIs.
 */
export function AdminMatchManager() {
  const [matches, setMatches] = useState<EditableMatch[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [status, setStatus] = useState<StatusOption>("scheduled");
  const [referee, setReferee] = useState("");
  const [ar1, setAr1] = useState("");
  const [ar2, setAr2] = useState("");
  const [postponeReason, setPostponeReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/matches");
      const json = (await res.json()) as { matches?: Match[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not load matches");
        setMatches([]);
        return;
      }
      const rows: EditableMatch[] = (json.matches ?? [])
        .filter((m) => Boolean(m.home_team_id && m.away_team_id))
        .map((m) => ({
          id: m.id,
          label: `${m.home_team?.name ?? "Team A"} vs ${m.away_team?.name ?? "Team B"}${
            m.tournament?.name ? ` · ${m.tournament.name}` : ""
          }`,
          sport: dbIdToSport(m.sport_id),
          venue_id: m.venue_id ?? "",
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
          scheduled_at: m.scheduled_at,
          tournament_id: m.tournament_id ?? null,
          home_team_id: m.home_team_id as string,
          away_team_id: m.away_team_id as string,
          home_team_name: m.home_team?.name ?? "Team A",
          away_team_name: m.away_team?.name ?? "Team B",
          referee_name: m.referee_name ?? "",
          assistant_referee_1: m.assistant_referee_1 ?? "",
          assistant_referee_2: m.assistant_referee_2 ?? "",
          postpone_reason: m.postpone_reason ?? "",
        }));
      setMatches(rows);
    } catch {
      setError("Network error loading matches");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => matches.find((m) => m.id === selectedId) ?? null,
    [matches, selectedId]
  );

  useEffect(() => {
    if (!selected) return;
    setVenueId(selected.venue_id);
    setHomeScore(selected.home_score);
    setAwayScore(selected.away_score);
    setStatus(
      selected.status === "live" ||
        selected.status === "completed" ||
        selected.status === "postponed"
        ? selected.status
        : "scheduled"
    );
    setReferee(selected.referee_name);
    setAr1(selected.assistant_referee_1);
    setAr2(selected.assistant_referee_2);
    setPostponeReason(selected.postpone_reason);
  }, [selected]);

  async function handleSave() {
    if (!selectedId) return;
    if (status === "postponed" && !postponeReason.trim()) {
      setError("Add a postpone reason before saving.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/matches/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venue_id: venueId || null,
        home_score: homeScore,
        away_score: awayScore,
        status,
        referee_name: referee.trim() || null,
        assistant_referee_1: ar1.trim() || null,
        assistant_referee_2: ar2.trim() || null,
        postpone_reason:
          status === "postponed" ? postponeReason.trim() || "Match postponed" : null,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Update failed");
      return;
    }

    setMatches((prev) =>
      prev.map((m) =>
        m.id === selectedId
          ? {
              ...m,
              venue_id: venueId,
              home_score: homeScore,
              away_score: awayScore,
              status,
              referee_name: referee.trim(),
              assistant_referee_1: ar1.trim(),
              assistant_referee_2: ar2.trim(),
              postpone_reason: status === "postponed" ? postponeReason.trim() : "",
            }
          : m
      )
    );
    setMessage("Match updated.");
  }

  async function handleSoftDelete() {
    if (!selectedId) return;
    if (!confirm("Admin action: soft-delete this match?\n\nIt will leave public lists but keep history.")) return;
    setBusy(true);
    const res = await fetch(`/api/matches/${selectedId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Delete failed");
      return;
    }
    setMatches((prev) => prev.filter((m) => m.id !== selectedId));
    setSelectedId("");
    setMessage("Match soft-deleted.");
  }

  return (
    <div className="table-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold">Edit match</h2>
          <p className="mt-1 text-sm opacity-70">
            Change venue, scores, officials, or status. Soft-delete removes it from lists without wiping history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-rule px-3 py-1.5 text-xs font-bold disabled:opacity-40"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-semibold">Match</span>
        <select
          className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? "Loading matches…" : "Select match"}</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              [{SPORT_LABELS[m.sport]}] {m.label}
            </option>
          ))}
        </select>
      </label>

      {!loading && matches.length === 0 && (
        <p className="mt-3 text-sm text-accent/60">No active matches in the live database.</p>
      )}

      {selected && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <VenueSelect value={venueId} onChange={setVenueId} sportSlug={selected.sport} />
          <label className="block text-sm">
            <span className="font-semibold">Status</span>
            <select
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusOption)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="postponed">Postponed</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Team A score</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={homeScore}
              onChange={(e) => setHomeScore(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Team B score</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={awayScore}
              onChange={(e) => setAwayScore(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Referee</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={referee}
              onChange={(e) => setReferee(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Assistant referee 1</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={ar1}
              onChange={(e) => setAr1(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Assistant referee 2</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={ar2}
              onChange={(e) => setAr2(e.target.value)}
              placeholder="Optional"
            />
          </label>
          {status === "postponed" && (
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Postpone reason</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                rows={2}
                value={postponeReason}
                onChange={(e) => setPostponeReason(e.target.value)}
                placeholder="Weather, pitch, …"
              />
            </label>
          )}
        </div>
      )}

      {selected && selected.tournament_id && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <AdminMatchLineupPanel
            matchId={selected.id}
            tournamentId={selected.tournament_id}
            teamId={selected.home_team_id}
            teamName={selected.home_team_name}
            scheduledAt={selected.scheduled_at}
          />
          <AdminMatchLineupPanel
            matchId={selected.id}
            tournamentId={selected.tournament_id}
            teamId={selected.away_team_id}
            teamName={selected.away_team_name}
            scheduledAt={selected.scheduled_at}
          />
        </div>
      )}

      {selected && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="btn-primary rounded-lg px-4 py-2 font-display text-sm font-bold disabled:opacity-40"
          >
            Save changes
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSoftDelete}
            className="rounded-lg border border-red-300 px-4 py-2 font-display text-sm font-bold text-red-600 disabled:opacity-40"
          >
            Soft-delete
          </button>
          <Link
            href={`/matches/${selected.id}?sport=${selected.sport}`}
            className="text-sm font-bold text-accent hover:underline"
          >
            Open match page
          </Link>
        </div>
      )}

      {message && <p className="mt-3 text-sm font-semibold text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
