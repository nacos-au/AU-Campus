"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dices, RefreshCw, Trophy } from "lucide-react";
import {
  buildKnockoutDraw,
  buildLeagueSchedule,
  nextEntrySize,
  type CompetitionType,
  type CupEntrySize,
  type KnockoutDraw,
  type RegisteredTeam,
} from "@/lib/competition/competition-builder";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ROSTER_UPDATED_EVENT } from "@/lib/roster/parse-roster";
import type { Team } from "@/lib/types/database";
import { sportToDbId, SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const ENTRY_SIZES: CupEntrySize[] = [2, 4, 8, 16, 32];

type Step = "basics" | "teams" | "draw" | "confirm";

export const COMPETITION_CREATED_EVENT = "au-score-competition-created";

export function AdminCompetitionWizard({
  onCreated,
}: {
  onCreated?: (id: string) => void;
} = {}) {
  const { confirm } = useConfirm();
  const [step, setStep] = useState<Step>("basics");
  const [name, setName] = useState("Inter-Faculty Pre-season 2026/27");
  const [season, setSeason] = useState("2026/27");
  const [sport, setSport] = useState<SportId>("football");
  const [type, setType] = useState<CompetitionType>("event");
  const [entrySize, setEntrySize] = useState<CupEntrySize | "auto">("auto");
  const [groupStage, setGroupStage] = useState(false);
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(true);
  const [titleHolder, setTitleHolder] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [randomize, setRandomize] = useState(true);
  const [drawSeed, setDrawSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [byeConfirmed, setByeConfirmed] = useState(false);
  const [publishState, setPublishState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [publishMessage, setPublishMessage] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  /** Preseason default 25; normal comps 22 — admin can override. */
  const [maxSquadSize, setMaxSquadSize] = useState(25);
  const [maxSubs, setMaxSubs] = useState(9);
  const [penaltyShootout, setPenaltyShootout] = useState(true);
  const [rosterPreset, setRosterPreset] = useState<"preseason" | "normal" | "custom">("preseason");

  const sportDbId = sportToDbId(sport);

  // Teams available for this sport — department sides (incl. bulk-imported) and guests.
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const loadTeams = useCallback(async (forSport: SportId) => {
    setTeamsLoading(true);
    try {
      const res = await fetch(`/api/roster?sport=${forSport}`);
      const json = (await res.json()) as { teams?: Team[] };
      setAvailableTeams(json.teams ?? []);
    } catch {
      setAvailableTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadTeams(sport);
  }, [sport, loadTeams]);
  // Re-fetch when the bulk import tool on the same page adds teams.
  useEffect(() => {
    const onUpdated = () => void loadTeams(sport);
    window.addEventListener(ROSTER_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(ROSTER_UPDATED_EVENT, onUpdated);
  }, [sport, loadTeams]);

  const registered: RegisteredTeam[] = useMemo(
    () =>
      selectedTeamIds.flatMap((id, i): RegisteredTeam[] => {
        const t = availableTeams.find((x) => x.id === id);
        return t ? [{ id: t.id, name: t.name, logo_url: t.logo_url, seed: i + 1 }] : [];
      }),
    [selectedTeamIds, availableTeams]
  );

  const resolvedEntrySize: CupEntrySize =
    entrySize === "auto" ? nextEntrySize(registered.length) : entrySize;

  const draw: KnockoutDraw | null = useMemo(() => {
    if (type !== "cup" || registered.length < 2) return null;
    try {
      return buildKnockoutDraw(registered, {
        entrySize: resolvedEntrySize,
        randomize,
        seed: drawSeed,
      });
    } catch {
      return null;
    }
  }, [type, registered, resolvedEntrySize, randomize, drawSeed]);

  const league = useMemo(() => {
    if (type !== "league" || registered.length < 2) return null;
    try {
      return buildLeagueSchedule(registered, { doubleRoundRobin });
    } catch {
      return null;
    }
  }, [type, registered, doubleRoundRobin]);

  const tooManyTeams = type === "cup" && entrySize !== "auto" && registered.length > entrySize;
  const needsByeConfirm = (draw?.byeCount ?? 0) > 0 && !byeConfirmed;

  function toggleTeam(id: string) {
    setByeConfirmed(false);
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveTeam(id: string, dir: -1 | 1) {
    setSelectedTeamIds((prev) => {
      const idx = prev.indexOf(id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  }

  async function handlePublish() {
    const ok = await confirm({
      eyebrow: "Admin action",
      title: "Publish this competition?",
      body: (
        <>
          <span className="block font-display text-base font-extrabold text-accent">
            “{name.trim()}” · {registered.length} teams
          </span>
          <span className="mt-1 block">
            {type === "event"
              ? "Creates the competition shell. You’ll add known fixtures next."
              : "This creates live fixtures."}
          </span>
        </>
      ),
      confirmLabel: "Publish",
    });
    if (!ok) return;

    setPublishState("saving");
    const payload = {
      name,
      sport_id: sportDbId,
      competition_type: type,
      season: season.trim() || "2026/27",
      title_holder_name: titleHolder || null,
      config: {
        ...(type === "cup"
          ? { entrySize: resolvedEntrySize, groupStage, randomize, seed: drawSeed }
          : type === "league"
            ? { doubleRoundRobin }
            : { manual_fixtures: true }),
        max_squad_size: maxSquadSize,
        max_subs: maxSubs,
        starters: Math.max(1, maxSquadSize - maxSubs),
        penalty_shootout: penaltyShootout,
        roster_preset: rosterPreset,
      },
      teams: registered,
      pairings: type === "cup" ? draw?.pairings ?? null : null,
      league_fixtures: type === "league" ? league?.fixtures ?? null : null,
    };

    try {
      const res = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        id?: string;
        message?: string;
        error?: string;
      };
      if (res.ok && json.ok) {
        setPublishState("done");
        setPublishMessage(
          type === "event"
            ? `${json.message ?? "Competition created."} Next: schedule fixtures, then fill squads.`
            : `${json.message ?? "Competition created."} Next: fill each club’s competition squad below.`
        );
        if (json.id) {
          setCreatedId(json.id);
          onCreated?.(json.id);
          window.dispatchEvent(
            new CustomEvent(COMPETITION_CREATED_EVENT, { detail: { id: json.id } })
          );
        }
      } else {
        setPublishState("error");
        setPublishMessage(json.error ?? "Failed to create competition.");
      }
    } catch {
      setPublishState("error");
      setPublishMessage("Network error — try again.");
    }
  }

  const steps: { id: Step; label: string }[] = [
    { id: "basics", label: "1 · Format" },
    { id: "teams", label: "2 · Teams" },
    {
      id: "draw",
      label:
        type === "cup" ? "3 · Draw" : type === "league" ? "3 · Schedule" : "3 · Fixtures",
    },
    { id: "confirm", label: "4 · Publish" },
  ];

  const canPublish =
    Boolean(name.trim()) &&
    registered.length >= 2 &&
    !tooManyTeams &&
    !needsByeConfirm &&
    publishState !== "saving" &&
    (type === "event" ||
      (type === "league" && Boolean(league)) ||
      (type === "cup" && Boolean(draw)));

  return (
    <div className="table-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Trophy className="h-5 w-5 text-accent" />
        Create Competition
      </h2>
      <p className="mt-1 text-sm opacity-70">
        Register clubs into a competition. Use <strong>Event / matchday</strong> when the
        fixtures are already known (one game each, idle sides OK). Leagues and cups auto-build
        a schedule; keepers pick up official fixtures after you publish.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-display text-xs font-bold",
              step === s.id ? "btn-filled" : "interactive-btn border-rule"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {step === "basics" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Competition name</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Inter-Faculty Pre-season 2026/27"
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold">Season</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="2026/27"
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold">Sport</span>
            <select
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={sport}
              onChange={(e) => {
                setSport(e.target.value as SportId);
                setSelectedTeamIds([]);
              }}
            >
              {(Object.keys(SPORT_LABELS) as SportId[]).map((s) => (
                <option key={s} value={s}>
                  {SPORT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-semibold">Type</span>
            <select
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as CompetitionType)}
            >
              <option value="event">Event / matchday (manual fixtures)</option>
              <option value="league">League (round robin · Team of the Season)</option>
              <option value="cup">Cup (knockout · Team of the Tournament)</option>
            </select>
          </label>

          {type === "cup" ? (
            <>
              <label className="block text-sm">
                <span className="font-semibold">Cup size</span>
                <select
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={entrySize}
                  onChange={(e) =>
                    setEntrySize(e.target.value === "auto" ? "auto" : (Number(e.target.value) as CupEntrySize))
                  }
                >
                  <option value="auto">Auto (fit registered teams)</option>
                  {ENTRY_SIZES.map((s) => (
                    <option key={s} value={s}>
                      Round of {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={groupStage}
                  onChange={(e) => setGroupStage(e.target.checked)}
                />
                <span className="font-semibold">Group stage before knockouts</span>
              </label>
            </>
          ) : type === "league" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doubleRoundRobin}
                onChange={(e) => setDoubleRoundRobin(e.target.checked)}
              />
              <span className="font-semibold">Home &amp; away (double round robin)</span>
            </label>
          ) : (
            <p className="rounded-lg bg-accent/5 px-3 py-2 text-sm text-accent sm:col-span-2">
              Odd team counts are fine — e.g. 9 clubs with 4 matches and one side resting.
              You enter each fixture yourself after publish (home, away, kick-off, venue).
            </p>
          )}

          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Title holder (previous winner — shown above the competition)</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={titleHolder}
              onChange={(e) => setTitleHolder(e.target.value)}
              placeholder="e.g. EEE Strikers (2024/25)"
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
              <option value="preseason">Pre-season · 25 squad / 9 subs</option>
              <option value="normal">Normal · 22 squad / 9 subs</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-semibold">Max squad size</span>
            <input
              type="number"
              min={2}
              max={40}
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={maxSquadSize}
              onChange={(e) => {
                setRosterPreset("custom");
                setMaxSquadSize(Number(e.target.value) || 0);
              }}
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold">Max substitutes</span>
            <input
              type="number"
              min={0}
              max={20}
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={maxSubs}
              onChange={(e) => {
                setRosterPreset("custom");
                setMaxSubs(Number(e.target.value) || 0);
              }}
            />
          </label>

          {(sport === "football" || type === "cup") && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={penaltyShootout}
                onChange={(e) => setPenaltyShootout(e.target.checked)}
              />
              <span className="font-semibold">
                Penalty shootouts allowed (cups / drawn knockout ties)
              </span>
            </label>
          )}
        </div>
      )}

      {step === "teams" && (
        <div className="mt-6">
          <p className="mb-3 text-sm">
            <span className="font-display font-bold">{registered.length}</span> registered
            {type === "cup" && (
              <span className="opacity-60">
                {" "}· bracket size {resolvedEntrySize}
                {draw && draw.byeCount > 0 && ` · ${draw.byeCount} bye${draw.byeCount === 1 ? "" : "s"}`}
              </span>
            )}
          </p>
          {tooManyTeams && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              Too many teams for a Round of {entrySize} — deselect some or increase the cup size.
            </p>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="opacity-60">
              {availableTeams.length} available in {SPORT_LABELS[sport]}
            </span>
            <button
              type="button"
              onClick={() => {
                setByeConfirmed(false);
                setSelectedTeamIds(availableTeams.filter((t) => !t.is_guest).map((t) => t.id));
              }}
              className="interactive-btn rounded-full border border-rule px-2.5 py-1 font-display font-bold"
            >
              Select all AU teams
            </button>
            <button
              type="button"
              onClick={() => setSelectedTeamIds([])}
              className="interactive-btn rounded-full border border-rule px-2.5 py-1 font-display font-bold"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => loadTeams(sport)}
              disabled={teamsLoading}
              title="Reload teams (after an import)"
              className="interactive-btn ml-auto inline-flex items-center gap-1 rounded-full border border-rule px-2.5 py-1 font-display font-bold disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", teamsLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableTeams.map((t) => {
              const checked = selectedTeamIds.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    checked ? "border-accent bg-accent/5 font-semibold" : "border-rule"
                  )}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleTeam(t.id)} />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  {t.is_guest && (
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase opacity-70">
                      Guest
                    </span>
                  )}
                </label>
              );
            })}
            {availableTeams.length === 0 && !teamsLoading && (
              <p className="text-sm opacity-60 sm:col-span-2">
                No teams registered for {SPORT_LABELS[sport]} yet — onboard them in the import tool above.
              </p>
            )}
          </div>
        </div>
      )}

      {step === "draw" && (
        <div className="mt-6 space-y-4">
          {type === "event" ? (
            <div className="rounded-lg border border-rule px-4 py-3 text-sm">
              <p className="font-display font-bold">Manual fixture list</p>
              <p className="mt-1 opacity-70">
                No auto schedule. After publish, use <strong>Schedule fixtures</strong> on this
                page to add each known match (kick-off + campus venue). Teams that aren’t named
                in a fixture simply don’t play — no bye advancement.
              </p>
              <p className="mt-2">
                <span className="font-display font-bold">{registered.length}</span> clubs registered
                {registered.length % 2 === 1 && (
                  <span className="opacity-70">
                    {" "}
                    · with one game each that leaves{" "}
                    <span className="font-semibold">1 club idle</span>
                  </span>
                )}
              </p>
            </div>
          ) : type === "cup" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={randomize}
                    onChange={() => setRandomize(true)}
                  />
                  <span className="font-semibold">Platform randomizes the draw</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!randomize}
                    onChange={() => setRandomize(false)}
                  />
                  <span className="font-semibold">Custom order (IRL draw already happened)</span>
                </label>
                {randomize && (
                  <button
                    type="button"
                    onClick={() => setDrawSeed(Math.floor(Math.random() * 1e9))}
                    className="interactive-btn ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rule px-3 py-1.5 font-display text-xs font-bold"
                  >
                    <Dices className="h-3.5 w-3.5" />
                    Redraw
                  </button>
                )}
              </div>

              {!randomize && (
                <div className="rounded-lg border border-rule">
                  <p className="border-b border-rule px-3 py-2 text-xs font-bold uppercase opacity-60">
                    Draw order (top plays first slot)
                  </p>
                  <ul className="divide-y divide-rule">
                    {registered.map((t, i) => (
                      <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                        <span className="w-5 font-mono text-xs opacity-50">{i + 1}</span>
                        <span className="flex-1">{t.name}</span>
                        <button type="button" onClick={() => moveTeam(t.id, -1)} className="interactive-btn rounded border border-rule px-2 text-xs">↑</button>
                        <button type="button" onClick={() => moveTeam(t.id, 1)} className="interactive-btn rounded border border-rule px-2 text-xs">↓</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {draw ? (
                <div>
                  {draw.warnings.map((w) => (
                    <p key={w} className="mb-3 rounded-lg bg-accent/5 px-3 py-2 text-sm font-semibold text-accent">
                      {w}
                    </p>
                  ))}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {draw.pairings.map((p) => (
                      <div
                        key={p.position}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm",
                          p.is_bye ? "border-dashed border-accent/40 bg-accent/5" : "border-rule"
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase opacity-50">
                          {p.round_label} · Tie {p.position + 1}
                        </p>
                        <p className="font-display font-bold">
                          {p.home?.name ?? "TBD"}
                          <span className="mx-1.5 opacity-40">vs</span>
                          {p.is_bye ? (
                            <span className="text-accent">BYE — advances automatically</span>
                          ) : (
                            (p.away?.name ?? "TBD")
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs opacity-60">
                    Then: {draw.futureRounds.map((r) => `${r.round_label} (${r.count})`).join(" → ")}
                  </p>
                </div>
              ) : (
                <p className="text-sm opacity-60">Register at least 2 teams to generate the draw.</p>
              )}
            </>
          ) : league ? (
            <div>
              {league.warnings.map((w) => (
                <p key={w} className="mb-3 rounded-lg bg-accent/5 px-3 py-2 text-sm font-semibold text-accent">
                  {w}
                </p>
              ))}
              <p className="text-sm">
                <span className="font-display font-bold">{league.fixtures.length}</span> fixtures over{" "}
                <span className="font-display font-bold">{league.matchweeks}</span> matchweeks.
              </p>
              <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-rule">
                <ul className="divide-y divide-rule text-sm">
                  {league.fixtures.slice(0, 40).map((f, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-1.5">
                      <span className="w-12 font-mono text-xs opacity-50">MW {f.matchweek}</span>
                      <span>
                        {f.home.name} <span className="opacity-40">vs</span> {f.away.name}
                      </span>
                    </li>
                  ))}
                  {league.fixtures.length > 40 && (
                    <li className="px-3 py-1.5 text-xs opacity-60">
                      … {league.fixtures.length - 40} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-60">Register at least 2 teams to generate the schedule.</p>
          )}
        </div>
      )}

      {step === "confirm" && (
        <div className="mt-6 space-y-4">
          <ul className="space-y-1 rounded-lg border border-rule px-4 py-3 text-sm">
            <li><span className="font-semibold">Name:</span> {name || "—"}</li>
            <li><span className="font-semibold">Season:</span> {season || "—"}</li>
            <li><span className="font-semibold">Sport:</span> {SPORT_LABELS[sport]}</li>
            <li>
              <span className="font-semibold">Type:</span>{" "}
              {type === "cup"
                ? `Cup · Round of ${resolvedEntrySize}${groupStage ? " with group stage" : ""} · Team of the Tournament`
                : type === "event"
                  ? "Event / matchday · manual fixtures (idle sides OK)"
                  : `League · ${doubleRoundRobin ? "double" : "single"} round robin · Team of the Season`}
            </li>
            <li><span className="font-semibold">Teams:</span> {registered.length}</li>
            <li>
              <span className="font-semibold">Competition roster:</span>{" "}
              max {maxSquadSize} players / {maxSubs} subs
              {rosterPreset !== "custom" ? ` (${rosterPreset})` : ""}
            </li>
            {titleHolder && <li><span className="font-semibold">Title holder:</span> {titleHolder}</li>}
            {draw && draw.byeCount > 0 && (
              <li className="text-accent">
                <span className="font-semibold">Byes:</span>{" "}
                {draw.byeTeams.map((t) => t.name).join(", ")} advance to the next round automatically.
              </li>
            )}
          </ul>

          {draw && draw.byeCount > 0 && (
            <label className="flex items-start gap-2 rounded-lg bg-accent/5 px-3 py-2 text-sm text-accent">
              <input
                type="checkbox"
                checked={byeConfirmed}
                onChange={(e) => setByeConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I confirm the bracket is short {draw.byeCount} team{draw.byeCount === 1 ? "" : "s"} and the
                listed teams should receive first-round byes.
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              className="btn-filled rounded-lg border px-4 py-2 font-display text-sm font-bold disabled:opacity-40"
            >
              {publishState === "saving" ? "Publishing…" : "Publish competition"}
            </button>
            {publishState === "done" && (
              <span className="text-sm font-semibold text-emerald-700">{publishMessage}</span>
            )}
            {publishState === "error" && (
              <span className="text-sm font-semibold text-red-700">{publishMessage}</span>
            )}
          </div>
          {publishState === "done" && createdId && (
            <p className="text-sm text-accent/70">
              {type === "event" ? (
                <>
                  Scroll to <span className="font-semibold">Schedule fixtures</span> to add the
                  known matches, then fill squads.
                </>
              ) : (
                <>
                  Scroll to <span className="font-semibold">Fill competition squads</span> to name
                  players for each of the {registered.length} clubs.
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
