"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { VenueSelect } from "@/components/admin/venue-select";
import type {
  CompetitionFixtureRow,
  CompetitionListItem,
  CompetitionTeamRow,
} from "@/lib/data/competition-rosters";
import { dbIdToSport, SPORT_LABELS, type SportId, sportToDbId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const inputClass = "mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm";

export function AdminCompetitionSchedulePanel({
  focusCompetitionId,
}: {
  focusCompetitionId?: string | null;
}) {
  const [sport, setSport] = useState<SportId>("football");
  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [competitionId, setCompetitionId] = useState("");
  const [teams, setTeams] = useState<CompetitionTeamRow[]>([]);
  const [fixtures, setFixtures] = useState<CompetitionFixtureRow[]>([]);
  const [idle, setIdle] = useState<CompetitionTeamRow[]>([]);
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [venueId, setVenueId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCompetitions = useCallback(async (forSport: SportId) => {
    try {
      const res = await fetch(`/api/competitions?sport=${sportToDbId(forSport)}`);
      const json = (await res.json()) as { competitions?: CompetitionListItem[] };
      setCompetitions(json.competitions ?? []);
    } catch {
      setCompetitions([]);
    }
  }, []);

  useEffect(() => {
    void loadCompetitions(sport);
  }, [sport, loadCompetitions]);

  useEffect(() => {
    if (focusCompetitionId) setCompetitionId(focusCompetitionId);
  }, [focusCompetitionId]);

  useEffect(() => {
    if (!competitionId && competitions[0]) setCompetitionId(competitions[0].id);
  }, [competitions, competitionId]);

  const loadFixtures = useCallback(async (id: string) => {
    if (!id) {
      setTeams([]);
      setFixtures([]);
      setIdle([]);
      return;
    }
    try {
      const res = await fetch(`/api/competitions/${id}/fixtures`);
      const json = (await res.json()) as {
        teams?: CompetitionTeamRow[];
        fixtures?: CompetitionFixtureRow[];
        idle_teams?: CompetitionTeamRow[];
        competition?: CompetitionListItem;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not load fixtures");
        return;
      }
      setTeams(json.teams ?? []);
      setFixtures(json.fixtures ?? []);
      setIdle(json.idle_teams ?? []);
      if (json.competition?.sport_id) {
        const inferred = dbIdToSport(json.competition.sport_id);
        // live UUIDs won't map — keep current sport filter
        if (json.competition.sport_id.startsWith("sport-")) {
          setSport(inferred);
        }
      }
      setHomeId((prev) =>
        prev && (json.teams ?? []).some((t) => t.team_id === prev)
          ? prev
          : json.teams?.[0]?.team_id ?? ""
      );
      setAwayId("");
      setError("");
    } catch {
      setError("Could not load fixtures");
    }
  }, []);

  useEffect(() => {
    void loadFixtures(competitionId);
  }, [competitionId, loadFixtures]);

  const playingIds = useMemo(() => {
    const s = new Set<string>();
    for (const f of fixtures) {
      if (f.home_team_id) s.add(f.home_team_id);
      if (f.away_team_id) s.add(f.away_team_id);
    }
    return s;
  }, [fixtures]);

  async function handleAdd() {
    setError("");
    setMessage("");
    if (!homeId || !awayId || !venueId || !scheduledAt) {
      setError("Home, away, venue, and kick-off are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_team_id: homeId,
          away_team_id: awayId,
          venue_id: venueId,
          scheduled_at: scheduledAt,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not add fixture");
        return;
      }
      setMessage("Fixture scheduled — keepers can pick it up.");
      setAwayId("");
      await loadFixtures(competitionId);
      await loadCompetitions(sport);
    } catch {
      setError("Could not add fixture");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="table-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <CalendarClock className="h-5 w-5 text-accent" />
        Schedule fixtures
      </h2>
      <p className="mt-1 text-sm opacity-70">
        Add known matches to a competition — kick-off and campus venue. One club can sit out;
        they just won&apos;t appear in a fixture.
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
                {c.name} · {c.season}
              </option>
            ))}
          </select>
        </label>
      </div>

      {teams.length > 0 && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="font-semibold">Home</span>
              <select
                className={inputClass}
                value={homeId}
                onChange={(e) => setHomeId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name}
                    {playingIds.has(t.team_id) ? " · already listed" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Away</span>
              <select
                className={inputClass}
                value={awayId}
                onChange={(e) => setAwayId(e.target.value)}
              >
                <option value="">Select away…</option>
                {teams
                  .filter((t) => t.team_id !== homeId)
                  .map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name}
                      {playingIds.has(t.team_id) ? " · already listed" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Kick-off</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
            <VenueSelect
              value={venueId}
              onChange={setVenueId}
              required
              sportSlug={sport}
            />
          </div>

          <button
            type="button"
            disabled={busy || !homeId || !awayId || !venueId}
            onClick={() => void handleAdd()}
            className="btn-filled mt-4 rounded-full px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40"
          >
            {busy ? "Saving…" : "Add fixture"}
          </button>

          {idle.length > 0 && (
            <p className="mt-3 text-sm text-accent/70">
              Not scheduled yet:{" "}
              <span className="font-semibold">
                {idle.map((t) => t.team_name).join(", ")}
              </span>
            </p>
          )}

          <ul className="mt-4 divide-y divide-rule rounded-lg border border-rule">
            {fixtures.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-accent/60">
                No fixtures yet — add the known matches above.
              </li>
            ) : (
              fixtures.map((f) => (
                <li
                  key={f.id}
                  className={cn("flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm")}
                >
                  <span className="font-display font-bold">
                    {f.home_team_name}{" "}
                    <span className="font-normal opacity-40">vs</span> {f.away_team_name}
                  </span>
                  <span className="text-xs text-accent/55">
                    {new Date(f.scheduled_at).toLocaleString()}
                    {f.venue_name ? ` · ${f.venue_name}` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm text-accent/80">{message}</p>}
    </div>
  );
}
