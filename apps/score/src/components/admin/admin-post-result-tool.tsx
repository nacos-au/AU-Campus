"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ScoreEntryFields, type ScoreEntryValue } from "@/components/admin/score-entry-fields";
import { VenueSelect } from "@/components/admin/venue-select";
import { DEMO_TEAMS } from "@/lib/data/demo";
import { sportToDbId, SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import type { MatchScope, Team } from "@/lib/types/database";

const AWAY_NEW_GUEST = "__new_guest__";

/**
 * Lets admin or record keeper post a finished match without live logging —
 * including friendlies against a guest team.
 */
export function AdminPostResultTool() {
  const [sport, setSport] = useState<SportId>("football");
  const [guestTeams, setGuestTeams] = useState<Team[]>([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestInstitution, setGuestInstitution] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [venueId, setVenueId] = useState("");
  const [scope, setScope] = useState<MatchScope>("official");
  const [score, setScore] = useState<ScoreEntryValue>({ home_score: 0, away_score: 0 });
  const [publishState, setPublishState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishedMatchId, setPublishedMatchId] = useState<string | null>(null);

  const sportDbId = sportToDbId(sport);
  const auTeams = useMemo(() => DEMO_TEAMS.filter((t) => t.sport_id === sportDbId), [sportDbId]);

  useEffect(() => {
    setHomeTeamId("");
    setAwayTeamId("");
    setPublishState("idle");
    fetch(`/api/guest-teams?sport=${sport}`)
      .then((r) => r.json())
      .then((json: { teams?: Team[] }) => setGuestTeams(json.teams ?? []))
      .catch(() => setGuestTeams([]));
  }, [sport]);

  const homeTeam = auTeams.find((t) => t.id === homeTeamId);
  const isNewGuest = awayTeamId === AWAY_NEW_GUEST;
  const awayTeam = [...auTeams, ...guestTeams].find((t) => t.id === awayTeamId);

  const canPublish =
    Boolean(homeTeamId) &&
    Boolean(venueId) &&
    (isNewGuest ? guestName.trim().length > 0 : Boolean(awayTeamId)) &&
    homeTeamId !== awayTeamId;

  async function handlePublish() {
    if (!canPublish || !homeTeam) return;
    const awayLabel = isNewGuest ? guestName.trim() : (awayTeam?.name ?? "Away");
    const ok = window.confirm(
      `Publish this result as Admin?\n\n${homeTeam.name} ${score.home_score}–${score.away_score} ${awayLabel}\n\nThis writes to the live Score record.`
    );
    if (!ok) return;

    setPublishState("saving");
    setPublishedMatchId(null);

    let resolvedAwayTeamId = awayTeamId;
    let resolvedAwayName = awayTeam?.name ?? "";

    if (isNewGuest) {
      const res = await fetch("/api/guest-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: guestName, sport, institution: guestInstitution }),
      });
      const json = (await res.json()) as { team?: Team; error?: string };
      if (!json.team) {
        setPublishState("error");
        setPublishMessage(json.error ?? "Could not save the guest team.");
        return;
      }
      resolvedAwayTeamId = json.team.id;
      resolvedAwayName = json.team.name;
      setGuestTeams((prev) => [...prev, json.team!]);
      setAwayTeamId(json.team.id);
      setGuestName("");
      setGuestInstitution("");
    }

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport_id: sportDbId,
          home_team_id: homeTeamId,
          away_team_id: resolvedAwayTeamId,
          status: "completed",
          scheduled_at: new Date(scheduledAt).toISOString(),
          home_score: score.home_score,
          away_score: score.away_score,
          set_scores: score.set_scores,
          venue_id: venueId,
          scope,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (res.ok && json.ok && json.id) {
        setPublishState("done");
        setPublishedMatchId(json.id);
        setPublishMessage(
          `${homeTeam.name} ${score.home_score}\u2013${score.away_score} ${resolvedAwayName} recorded.`
        );
      } else {
        setPublishState("error");
        setPublishMessage(json.error ?? "Failed to save the result.");
      }
    } catch {
      setPublishState("error");
      setPublishMessage("Network error — try again.");
    }
  }

  return (
    <div className="table-card p-6">
      <h2 className="font-display text-lg font-extrabold">Post a Result</h2>
      <p className="mt-1 text-sm opacity-70">
        Admin or record keeper — enter a final score without live logging, including
        friendlies against a guest team from another university.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Sport</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={sport}
            onChange={(e) => setSport(e.target.value as SportId)}
          >
            {(Object.keys(SPORT_LABELS) as SportId[])
              .filter((s) => s === "football" || s === "basketball" || s === "volleyball" || s === "tennis")
              .map((s) => (
              <option key={s} value={s}>
                {SPORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Date</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </label>
        <VenueSelect value={venueId} onChange={setVenueId} required />
        <label className="block text-sm">
          <span className="font-semibold">Match type</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={scope}
            onChange={(e) => setScope(e.target.value as MatchScope)}
          >
            <option value="official">Official</option>
            <option value="pickup">Friendly / pickup</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Home team</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
          >
            <option value="">Select team</option>
            {auTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Away team</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
          >
            <option value="">Select team</option>
            {auTeams
              .filter((t) => t.id !== homeTeamId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            {guestTeams.length > 0 && (
              <optgroup label="Guest teams">
                {guestTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.institution ?? "Guest"})
                  </option>
                ))}
              </optgroup>
            )}
            <option value={AWAY_NEW_GUEST}>+ Add a new guest team…</option>
          </select>
        </label>
      </div>

      {isNewGuest && (
        <div className="mt-4 grid gap-3 rounded-lg border border-dashed border-rule p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold">Guest team name</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Unilag Marines"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Institution</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={guestInstitution}
              onChange={(e) => setGuestInstitution(e.target.value)}
              placeholder="e.g. University of Lagos"
            />
          </label>
        </div>
      )}

      <div className="mt-5 border-t border-rule pt-5">
        <ScoreEntryFields
          sport={sport}
          homeLabel={homeTeam?.name ?? "Home"}
          awayLabel={isNewGuest ? guestName || "Guest team" : (awayTeam?.name ?? "Away")}
          onChange={setScore}
        />
      </div>

      <button
        type="button"
        onClick={handlePublish}
        disabled={!canPublish || publishState === "saving"}
        className="btn-primary mt-5 w-full rounded-lg px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40 sm:w-auto"
      >
        {publishState === "saving" ? "Publishing…" : "Publish result"}
      </button>

      {publishState === "done" && (
        <div className="mt-3 space-y-1 text-sm font-semibold text-green-700">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> {publishMessage}
          </p>
          {publishedMatchId && (
            <Link href={`/matches/${publishedMatchId}?sport=${sport}`} className="text-accent hover:underline">
              View match page
            </Link>
          )}
        </div>
      )}
      {publishState === "error" && <p className="mt-3 text-sm font-semibold text-red-600">{publishMessage}</p>}
    </div>
  );
}
