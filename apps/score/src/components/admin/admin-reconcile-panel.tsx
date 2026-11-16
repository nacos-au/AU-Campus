"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RosterPlayerRow } from "@/lib/data/demo-roster";
import type { Match } from "@/lib/types/database";
import { dbIdToSport, type SportId } from "@/lib/utils/sport";

type GoalDraft = {
  key: string;
  /** Empty string = minute unknown / pending */
  minute: string;
  side: "home" | "away";
  event_type: "goal" | "penalty_scored" | "own_goal";
  player_id: string;
  player_name: string;
  assist_player_id: string;
  assist_player_name: string;
  solo_goal: boolean;
  assist_pending: boolean;
};

type MatchOption = {
  id: string;
  label: string;
  sport: SportId;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  status: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm";

function newKey() {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AdminReconcilePanel() {
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [homePlayers, setHomePlayers] = useState<RosterPlayerRow[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<RosterPlayerRow[]>([]);
  const [homeGkId, setHomeGkId] = useState("");
  const [awayGkId, setAwayGkId] = useState("");
  const [statsOpen, setStatsOpen] = useState(false);
  const [homeStats, setHomeStats] = useState({
    shots_on_target: 0,
    saves: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    yellow_cards: 0,
    red_cards: 0,
  });
  const [awayStats, setAwayStats] = useState({
    shots_on_target: 0,
    saves: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    yellow_cards: 0,
    red_cards: 0,
  });
  const [scoreOnly, setScoreOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/matches", { credentials: "same-origin" });
      const json = (await res.json().catch(() => ({}))) as {
        matches?: Match[];
        error?: string;
      };
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Not signed in on AU Score. Sign in on this site, then refresh."
            : json.error ?? "Could not load matches"
        );
        setMatches([]);
        return;
      }
      const rows: MatchOption[] = (json.matches ?? [])
        .filter((m) => m.home_team_id && m.away_team_id)
        .map((m) => ({
          id: m.id,
          label: `${m.home_team?.name ?? "Home"} vs ${m.away_team?.name ?? "Away"}${
            m.tournament?.name ? ` · ${m.tournament.name}` : ""
          } · ${m.status}`,
          sport: dbIdToSport(m.sport_id),
          home_team_id: m.home_team_id as string,
          away_team_id: m.away_team_id as string,
          home_team_name: m.home_team?.name ?? "Home",
          away_team_name: m.away_team?.name ?? "Away",
          home_score: m.home_score ?? 0,
          away_score: m.away_score ?? 0,
          status: m.status,
        }));
      setMatches(rows);
    } catch {
      setMatches([]);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => m.label.toLowerCase().includes(q));
  }, [matches, query]);

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setHomeScore(selected.home_score);
    setAwayScore(selected.away_score);
    setGoals([]);
    setScoreOnly(false);
    setHomeGkId("");
    setAwayGkId("");
    setMessage("");
    setError("");

    async function loadPlayers(teamId: string, sport: SportId) {
      const res = await fetch(`/api/roster?sport=${sport}&players=1&teamId=${teamId}`);
      const json = (await res.json()) as { players?: RosterPlayerRow[] };
      return json.players ?? [];
    }

    void (async () => {
      const [home, away] = await Promise.all([
        loadPlayers(selected.home_team_id, selected.sport),
        loadPlayers(selected.away_team_id, selected.sport),
      ]);
      setHomePlayers(home);
      setAwayPlayers(away);
    })();
  }, [selected]);

  function addGoal() {
    setScoreOnly(false);
    setGoals((prev) => [
      ...prev,
      {
        key: newKey(),
        minute: "",
        side: "home",
        event_type: "goal",
        player_id: "",
        player_name: "",
        assist_player_id: "",
        assist_player_name: "",
        solo_goal: false,
        assist_pending: true,
      },
    ]);
  }

  function updateGoal(key: string, patch: Partial<GoalDraft>) {
    setGoals((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  function pickPlayer(side: "home" | "away", playerId: string) {
    const list = side === "home" ? homePlayers : awayPlayers;
    const p = list.find((x) => x.id === playerId);
    return p ? { id: p.id, name: `${p.first_name} ${p.last_name}` } : { id: "", name: "" };
  }

  async function handleSave() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const useScoreOnly = scoreOnly || goals.length === 0;

      const payloadGoals = useScoreOnly
        ? []
        : goals.map((g) => {
            const team_id = g.side === "home" ? selected.home_team_id : selected.away_team_id;
            const minuteTrim = g.minute.trim();
            const minuteNum = minuteTrim === "" ? null : Number(minuteTrim);
            return {
              minute: minuteNum != null && !Number.isNaN(minuteNum) ? minuteNum : null,
              team_id,
              player_id: g.player_id,
              player_name: g.player_name,
              event_type: g.event_type,
              assist_player_id:
                g.solo_goal || g.assist_pending || g.event_type !== "goal"
                  ? null
                  : g.assist_player_id || null,
              assist_player_name:
                g.solo_goal || g.assist_pending || g.event_type !== "goal"
                  ? null
                  : g.assist_player_name || null,
              solo_goal: g.event_type === "goal" ? g.solo_goal : false,
              assist_pending: g.event_type === "goal" ? g.assist_pending : false,
            };
          });

      if (!useScoreOnly) {
        for (const g of payloadGoals) {
          if (!g.player_id) {
            setError("Every goal needs a scorer from the club pool.");
            setBusy(false);
            return;
          }
        }
      }

      const homeGk = homePlayers.find((p) => p.id === homeGkId);
      const awayGk = awayPlayers.find((p) => p.id === awayGkId);
      const goalkeepers =
        homeGk && awayGk
          ? [
              {
                team_id: selected.home_team_id,
                starter_player_id: homeGk.id,
                starter_player_name: `${homeGk.first_name} ${homeGk.last_name}`,
              },
              {
                team_id: selected.away_team_id,
                starter_player_id: awayGk.id,
                starter_player_name: `${awayGk.first_name} ${awayGk.last_name}`,
              },
            ]
          : undefined;

      if (!useScoreOnly && (!homeGk || !awayGk)) {
        setError("Pick a starting GK for each side when logging scorers (clean sheets), or use score-only.");
        setBusy(false);
        return;
      }

      const res = await fetch(`/api/matches/${selected.id}/reconcile`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_score: homeScore,
          away_score: awayScore,
          goals: payloadGoals,
          allow_score_only: useScoreOnly,
          mark_completed: true,
          goalkeepers,
          team_stats: statsOpen
            ? [
                { team_id: selected.home_team_id, ...homeStats },
                { team_id: selected.away_team_id, ...awayStats },
              ]
            : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        reason?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setError(
            json.reason === "session_expired"
              ? "Score session expired (2h). Sign in again on au-score — Campus login is a different cookie."
              : "Not signed in on AU Score. Open Score sign-in on this tab (Campus/Digest sessions do not carry over)."
          );
          return;
        }
        setError(json.error ?? "Reconcile failed");
        return;
      }
      setMessage(
        useScoreOnly
          ? "Score saved and match completed (scorers can be added later)."
          : "Match reconciled and marked completed."
      );
      await loadMatches();
    } catch {
      setError("Network error saving reconcile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="table-card space-y-4 p-6">
      <div>
        <h3 className="font-display text-lg font-extrabold">Reconcile result</h3>
        <p className="mt-1 text-sm text-accent/70">
          Past comps can be score-only (e.g. FOSMAS 2–1 LAW). For newer matches add scorers —
          minute and assist can stay pending until you have real names.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-semibold">Search matches</span>
        <input
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Club or competition name…"
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold">Match</span>
        <select
          className={inputClass}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Select a match…</option>
          {filtered.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {selected && selected.sport === "football" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold">{selected.home_team_name} score</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={homeScore}
                onChange={(e) => setHomeScore(Number(e.target.value))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">{selected.away_team_name} score</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={awayScore}
                onChange={(e) => setAwayScore(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold">{selected.home_team_name} GK</span>
              <select
                className={inputClass}
                value={homeGkId}
                onChange={(e) => setHomeGkId(e.target.value)}
              >
                <option value="">Select GK…</option>
                {homePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold">{selected.away_team_name} GK</span>
              <select
                className={inputClass}
                value={awayGkId}
                onChange={(e) => setAwayGkId(e.target.value)}
              >
                <option value="">Select GK…</option>
                {awayPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={scoreOnly}
              onChange={(e) => {
                setScoreOnly(e.target.checked);
                if (e.target.checked) setGoals([]);
              }}
            />
            Score only (no scorers yet — for past results like MLS 1–1 FONAS)
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display text-sm font-extrabold">Goals</h4>
              <button
                type="button"
                disabled={scoreOnly}
                className="btn-filled rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                onClick={addGoal}
              >
                Add goal
              </button>
            </div>
            {!scoreOnly && goals.length === 0 && (
              <p className="text-sm text-accent/60">
                Optional for now: leave minute blank, mark assist Pending, or Solo when known.
              </p>
            )}
            {!scoreOnly &&
              goals.map((g) => {
              const sidePlayers = g.side === "home" ? homePlayers : awayPlayers;
              return (
                <div key={g.key} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-6">
                  <label className="text-xs sm:col-span-1">
                    Min
                    <input
                      type="number"
                      min={1}
                      max={120}
                      className={inputClass}
                      value={g.minute}
                      placeholder="?"
                      onChange={(e) => updateGoal(g.key, { minute: e.target.value })}
                    />
                  </label>
                  <label className="text-xs sm:col-span-1">
                    Side
                    <select
                      className={inputClass}
                      value={g.side}
                      onChange={(e) =>
                        updateGoal(g.key, {
                          side: e.target.value as "home" | "away",
                          player_id: "",
                          player_name: "",
                          assist_player_id: "",
                          assist_player_name: "",
                        })
                      }
                    >
                      <option value="home">{selected.home_team_name}</option>
                      <option value="away">{selected.away_team_name}</option>
                    </select>
                  </label>
                  <label className="text-xs sm:col-span-1">
                    Type
                    <select
                      className={inputClass}
                      value={g.event_type}
                      onChange={(e) =>
                        updateGoal(g.key, {
                          event_type: e.target.value as GoalDraft["event_type"],
                          solo_goal: e.target.value !== "goal" ? false : g.solo_goal,
                        })
                      }
                    >
                      <option value="goal">Goal</option>
                      <option value="penalty_scored">Penalty</option>
                      <option value="own_goal">Own goal</option>
                    </select>
                  </label>
                  <label className="text-xs sm:col-span-1">
                    Scorer
                    <select
                      className={inputClass}
                      value={g.player_id}
                      onChange={(e) => {
                        const picked = pickPlayer(g.side, e.target.value);
                        updateGoal(g.key, { player_id: picked.id, player_name: picked.name });
                      }}
                    >
                      <option value="">Select…</option>
                      {sidePlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {g.event_type === "goal" ? (
                    <label className="text-xs sm:col-span-2">
                      Assist / Solo / Pending
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <select
                          className="min-w-0 flex-1 rounded-lg border border-rule px-3 py-2 text-sm disabled:opacity-50"
                          disabled={g.solo_goal || g.assist_pending}
                          value={g.assist_player_id}
                          onChange={(e) => {
                            const picked = pickPlayer(g.side, e.target.value);
                            updateGoal(g.key, {
                              assist_player_id: picked.id,
                              assist_player_name: picked.name,
                              solo_goal: false,
                              assist_pending: false,
                            });
                          }}
                        >
                          <option value="">Assister…</option>
                          {sidePlayers
                            .filter((p) => p.id !== g.player_id)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.first_name} {p.last_name}
                              </option>
                            ))}
                        </select>
                        <label className="inline-flex items-center gap-1 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={g.solo_goal}
                            onChange={(e) =>
                              updateGoal(g.key, {
                                solo_goal: e.target.checked,
                                assist_pending: false,
                                assist_player_id: "",
                                assist_player_name: "",
                              })
                            }
                          />
                          Solo
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={g.assist_pending}
                            onChange={(e) =>
                              updateGoal(g.key, {
                                assist_pending: e.target.checked,
                                solo_goal: false,
                                assist_player_id: "",
                                assist_player_name: "",
                              })
                            }
                          />
                          Pending
                        </label>
                      </div>
                    </label>
                  ) : (
                    <div className="text-xs text-accent/50 sm:col-span-2">No assist for this type</div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="text-sm font-semibold text-accent underline"
            onClick={() => setStatsOpen((v) => !v)}
          >
            {statsOpen ? "Hide optional match stats" : "Add optional match stats"}
          </button>

          {statsOpen && (
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["home", selected.home_team_name, homeStats, setHomeStats],
                ["away", selected.away_team_name, awayStats, setAwayStats],
              ] as const).map(([key, name, stats, setStats]) => (
                <div key={key} className="rounded-lg border border-rule p-3">
                  <p className="mb-2 font-display text-sm font-bold">{name}</p>
                  {(
                    [
                      "shots_on_target",
                      "saves",
                      "corners",
                      "fouls",
                      "offsides",
                      "yellow_cards",
                      "red_cards",
                    ] as const
                  ).map((field) => (
                    <label key={field} className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span>{field.replaceAll("_", " ")}</span>
                      <input
                        type="number"
                        min={0}
                        className="w-20 rounded border border-rule px-2 py-1"
                        value={stats[field]}
                        onChange={(e) => setStats({ ...stats, [field]: Number(e.target.value) })}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="btn-filled rounded-full px-5 py-2.5 font-display text-sm font-bold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save reconcile & complete"}
          </button>
        </>
      )}

      {selected && selected.sport !== "football" && (
        <p className="text-sm text-accent/70">
          Football reconcile is available here. For {selected.sport}, use Edit match for scores for
          now — scorer panels for other sports come next.
        </p>
      )}

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      {message && <p className="text-sm font-semibold text-[#004e28]">{message}</p>}
    </div>
  );
}
