"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Handshake } from "lucide-react";
import { ScoreEntryFields, type ScoreEntryValue } from "@/components/admin/score-entry-fields";
import { VenueSelect } from "@/components/admin/venue-select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ROSTER_UPDATED_EVENT } from "@/lib/roster/parse-roster";
import { sportToDbId, SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import type { MatchScope, Team } from "@/lib/types/database";

const AWAY_NEW_GUEST = "__new_guest__";

/**
 * Admin-only: friendlies and one-off matches that are not part of a
 * published competition. Keepers pick up competition fixtures themselves.
 */
export function AdminPostResultTool() {
  const { confirm } = useConfirm();
  const [sport, setSport] = useState<SportId>("football");
  const [sportTeams, setSportTeams] = useState<Team[]>([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestInstitution, setGuestInstitution] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [venueId, setVenueId] = useState("");
  const [scope, setScope] = useState<MatchScope>("pickup");
  const [finished, setFinished] = useState(true);
  const [score, setScore] = useState<ScoreEntryValue>({ home_score: 0, away_score: 0 });
  const [publishState, setPublishState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishedMatchId, setPublishedMatchId] = useState<string | null>(null);

  const sportDbId = sportToDbId(sport);
  const auTeams = useMemo(() => sportTeams.filter((t) => !t.is_guest), [sportTeams]);
  const guestTeams = useMemo(() => sportTeams.filter((t) => t.is_guest), [sportTeams]);

  const loadTeams = useCallback(async (forSport: SportId) => {
    try {
      const res = await fetch(`/api/roster?sport=${forSport}`);
      const json = (await res.json()) as { teams?: Team[] };
      setSportTeams(json.teams ?? []);
    } catch {
      setSportTeams([]);
    }
  }, []);

  useEffect(() => {
    setHomeTeamId("");
    setAwayTeamId("");
    setVenueId("");
    setPublishState("idle");
    void loadTeams(sport);
  }, [sport, loadTeams]);

  useEffect(() => {
    const onUpdated = () => void loadTeams(sport);
    window.addEventListener(ROSTER_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(ROSTER_UPDATED_EVENT, onUpdated);
  }, [sport, loadTeams]);

  const allTeams = useMemo(() => [...auTeams, ...guestTeams], [auTeams, guestTeams]);
  const homeTeam = allTeams.find((t) => t.id === homeTeamId);
  const isNewGuest = awayTeamId === AWAY_NEW_GUEST;
  const awayTeam = allTeams.find((t) => t.id === awayTeamId);

  const canPublish =
    Boolean(homeTeamId) &&
    Boolean(homeTeam) &&
    Boolean(venueId) &&
    (isNewGuest ? guestName.trim().length > 0 : Boolean(awayTeamId)) &&
    homeTeamId !== awayTeamId;

  async function handlePublish() {
    if (!canPublish) {
      setPublishState("error");
      setPublishMessage(
        !venueId
          ? "Pick a venue first."
          : !homeTeamId || !homeTeam
            ? "Pick Team A."
            : !awayTeamId && !isNewGuest
              ? "Pick Team B."
              : "Fill every required field, then try again."
      );
      return;
    }
    if (!homeTeam) return;
    const awayLabel = isNewGuest ? guestName.trim() : (awayTeam?.name ?? "Away");
    const ok = await confirm({
      eyebrow: scope === "pickup" ? "Friendly" : "Manual match",
      title: finished ? "Publish this result?" : "Schedule this match?",
      body: (
        <>
          <span className="block font-display text-base font-extrabold text-accent">
            {finished
              ? `${homeTeam.name} ${score.home_score}–${score.away_score} ${awayLabel}`
              : `${homeTeam.name} vs ${awayLabel}`}
          </span>
          <span className="mt-1 block">
            {finished
              ? "This writes to the live Score record as a completed result."
              : "Scheduled for keepers — it will appear on the Open matches list."}
          </span>
        </>
      ),
      confirmLabel: finished ? "Publish" : "Schedule",
    });
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
      setSportTeams((prev) => [...prev, json.team!]);
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
          status: finished ? "completed" : "scheduled",
          scheduled_at: new Date(scheduledAt).toISOString(),
          home_score: finished ? score.home_score : 0,
          away_score: finished ? score.away_score : 0,
          home_penalties: finished ? score.home_penalties ?? null : null,
          away_penalties: finished ? score.away_penalties ?? null : null,
          set_scores: finished ? score.set_scores : undefined,
          venue_id: venueId,
          scope,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (res.ok && json.ok && json.id) {
        setPublishState("done");
        setPublishedMatchId(json.id);
        const pens =
          finished && score.home_penalties != null && score.away_penalties != null
            ? ` (pens ${score.home_penalties}\u2013${score.away_penalties})`
            : "";
        setPublishMessage(
          finished
            ? `${homeTeam.name} ${score.home_score}\u2013${score.away_score} ${resolvedAwayName}${pens} recorded.`
            : `${homeTeam.name} vs ${resolvedAwayName} scheduled.`
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
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Handshake className="h-5 w-5 text-accent" />
        Friendlies &amp; manual matches
      </h2>
      <p className="mt-1 text-sm opacity-70">
        Admin only. Use this for friendlies (including guest sides) and one-off matches
        that aren’t in a published competition. League and cup fixtures are filled in by
        keepers.
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
        <VenueSelect value={venueId} onChange={setVenueId} required sportSlug={sport} />
        <label className="block text-sm">
          <span className="font-semibold">Match type</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={scope}
            onChange={(e) => setScope(e.target.value as MatchScope)}
          >
            <option value="pickup">Friendly / pickup</option>
            <option value="official">Manual official (not in a competition)</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Team A</span>
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
            {guestTeams.length > 0 && (
              <optgroup label="Guest teams">
                {guestTeams
                  .filter((t) => t.id !== awayTeamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.institution ?? "Guest"})
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Team B</span>
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
                {guestTeams
                  .filter((t) => t.id !== homeTeamId)
                  .map((t) => (
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

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={finished} onChange={(e) => setFinished(e.target.checked)} />
        <span className="font-semibold">Record as a finished score</span>
        <span className="opacity-60">uncheck to schedule without a result</span>
      </label>

      {finished && (
        <div className="mt-5 border-t border-rule pt-5">
          <ScoreEntryFields
            sport={sport}
            homeLabel={homeTeam?.name ?? "Home"}
            awayLabel={isNewGuest ? guestName || "Guest team" : (awayTeam?.name ?? "Away")}
            onChange={setScore}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => void handlePublish()}
        disabled={publishState === "saving"}
        className="btn-primary mt-5 w-full rounded-lg px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40 sm:w-auto"
      >
        {publishState === "saving" ? "Saving…" : finished ? "Publish result" : "Schedule match"}
      </button>

      {publishState === "error" && publishMessage && (
        <p className="mt-3 text-sm font-semibold text-red-600">{publishMessage}</p>
      )}

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
