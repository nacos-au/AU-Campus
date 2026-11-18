"use client";

import { useCallback, useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";
import type { CompetitionListItem } from "@/lib/data/competition-rosters";
import type {
  MatchLogCard,
  MatchLogGoal,
  MatchLogPayload,
  MatchStatLog,
} from "@/lib/data/match-stat-logs";
import { SPORT_LABELS, type SportId, sportToDbId } from "@/lib/utils/sport";

const inputClass =
  "mt-1 w-full rounded-lg border border-rule px-3 py-3 text-base sm:py-2 sm:text-sm";

function emptyGoal(side: "home" | "away" = "home"): MatchLogGoal {
  return {
    minute: "",
    type: "goal",
    side,
    scorer_name: "",
    solo: true,
    assist_name: "",
  };
}

function emptyCard(side: "home" | "away" = "home"): MatchLogCard {
  return { minute: "", type: "yellow", side, player_name: "" };
}

export function AdminMatchNotepad() {
  const [sport, setSport] = useState<SportId>("football");
  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [logs, setLogs] = useState<MatchStatLog[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [homeName, setHomeName] = useState("");
  const [awayName, setAwayName] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [homeGk, setHomeGk] = useState("");
  const [awayGk, setAwayGk] = useState("");
  const [goalsNil, setGoalsNil] = useState(false);
  const [cardsNil, setCardsNil] = useState(false);
  const [goals, setGoals] = useState<MatchLogGoal[]>([]);
  const [cards, setCards] = useState<MatchLogCard[]>([]);
  const [notes, setNotes] = useState("");

  const active = competitions.find((c) => c.id === tournamentId) ?? null;

  const loadCompetitions = useCallback(async (s: SportId) => {
    try {
      const res = await fetch(`/api/competitions?sport=${sportToDbId(s)}`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as { competitions?: CompetitionListItem[] };
      setCompetitions(json.competitions ?? []);
    } catch {
      setCompetitions([]);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    if (!tournamentId) {
      setLogs([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/match-logs?sport=${sport}&tournamentId=${encodeURIComponent(tournamentId)}`,
        { credentials: "same-origin" }
      );
      const json = (await res.json()) as { logs?: MatchStatLog[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not load logs");
        setLogs([]);
        return;
      }
      setLogs(json.logs ?? []);
    } catch {
      setError("Could not load logs");
    }
  }, [sport, tournamentId]);

  useEffect(() => {
    void loadCompetitions(sport);
    setTournamentId("");
  }, [sport, loadCompetitions]);

  useEffect(() => {
    if (!tournamentId && competitions[0]) setTournamentId(competitions[0].id);
  }, [competitions, tournamentId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  function resetForm() {
    setEditingId(null);
    setHomeName("");
    setAwayName("");
    setHomeScore("");
    setAwayScore("");
    setKickoff("");
    setHomeGk("");
    setAwayGk("");
    setGoalsNil(false);
    setCardsNil(false);
    setGoals([]);
    setCards([]);
    setNotes("");
    setError("");
    setMessage("");
  }

  function openNew() {
    resetForm();
    setKickoff(new Date().toISOString().slice(0, 16));
  }

  function openLog(log: MatchStatLog) {
    setEditingId(log.id);
    setHomeName(log.home_team_name ?? "");
    setAwayName(log.away_team_name ?? "");
    setHomeScore(log.home_score != null ? String(log.home_score) : "");
    setAwayScore(log.away_score != null ? String(log.away_score) : "");
    setKickoff(
      log.scheduled_at ? new Date(log.scheduled_at).toISOString().slice(0, 16) : ""
    );
    const p = log.payload ?? {};
    setHomeGk(p.goalkeepers?.home?.player_name ?? "");
    setAwayGk(p.goalkeepers?.away?.player_name ?? "");
    setGoalsNil(Boolean(p.goals_nil));
    setCardsNil(Boolean(p.cards_nil));
    setGoals(p.goals ?? []);
    setCards(p.cards ?? []);
    setNotes(p.notes ?? "");
    setError("");
    setMessage("");
  }

  async function save() {
    if (!tournamentId) {
      setError("Pick a competition first");
      return;
    }
    if (!homeName.trim() || !awayName.trim()) {
      setError("Enter both club names");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const payload: MatchLogPayload = {
      goals_nil: goalsNil,
      cards_nil: cardsNil,
      goalkeepers: {
        home: homeGk.trim() ? { player_name: homeGk.trim() } : null,
        away: awayGk.trim() ? { player_name: awayGk.trim() } : null,
      },
      goals: goalsNil ? [] : goals,
      cards: cardsNil ? [] : cards,
      notes: notes.trim(),
    };
    const body = {
      id: editingId ?? undefined,
      sport,
      tournament_id: tournamentId,
      season: active?.season ?? "2026/27",
      home_team_name: homeName.trim(),
      away_team_name: awayName.trim(),
      home_score: homeScore === "" ? null : Number(homeScore),
      away_score: awayScore === "" ? null : Number(awayScore),
      scheduled_at: kickoff ? new Date(kickoff).toISOString() : null,
      payload,
    };
    try {
      const res = await fetch(editingId ? `/api/match-logs/${editingId}` : "/api/match-logs", {
        method: editingId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      setMessage("Saved");
      setEditingId(json.id ?? editingId);
      await loadLogs();
    } catch {
      setError("Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="table-card space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <h2 className="font-display text-lg font-extrabold">Match Notepad</h2>
          <p className="mt-1 text-sm text-accent/70">
            Pitch-side capture for record keepers. Separate from live Stats — use this to record
            score, GKs, goals, assists/Solo, and cards, then compare when you reconcile digitally.
            Mark a section <span className="font-semibold">Nil</span> when there is nothing to log.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Sport</span>
          <select
            className={inputClass}
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
          <span className="font-semibold">Competition</span>
          <select
            className={inputClass}
            value={tournamentId}
            onChange={(e) => {
              setTournamentId(e.target.value);
              resetForm();
            }}
          >
            {competitions.length === 0 && <option value="">No competitions</option>}
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.season}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openNew}
          className="btn-filled rounded-lg px-4 py-3 text-sm font-bold sm:py-2"
        >
          New match log
        </button>
      </div>

      {(editingId !== null || homeName || awayName || kickoff) && (
        <div className="space-y-4 rounded-xl border border-rule bg-white p-4">
          <p className="font-display text-sm font-extrabold uppercase tracking-wide opacity-60">
            {editingId ? "Edit log" : "New log"}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold">Home club</span>
              <input className={inputClass} value={homeName} onChange={(e) => setHomeName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Away club</span>
              <input className={inputClass} value={awayName} onChange={(e) => setAwayName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Home score</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Away score</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Kick-off</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={kickoff}
                onChange={(e) => setKickoff(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold">Starting GK · home</span>
              <input
                className={inputClass}
                placeholder="Name"
                value={homeGk}
                onChange={(e) => setHomeGk(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Starting GK · away</span>
              <input
                className={inputClass}
                placeholder="Name"
                value={awayGk}
                onChange={(e) => setAwayGk(e.target.value)}
              />
            </label>
          </div>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-extrabold">Goals</h3>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={goalsNil}
                  onChange={(e) => {
                    setGoalsNil(e.target.checked);
                    if (e.target.checked) setGoals([]);
                  }}
                />
                Nil
              </label>
            </div>
            {!goalsNil && (
              <>
                {goals.map((g, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Minute
                      <input
                        className={inputClass}
                        value={g.minute}
                        onChange={(e) =>
                          setGoals((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, minute: e.target.value } : x))
                          )
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Side
                      <select
                        className={inputClass}
                        value={g.side}
                        onChange={(e) =>
                          setGoals((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, side: e.target.value as "home" | "away" } : x
                            )
                          )
                        }
                      >
                        <option value="home">Home</option>
                        <option value="away">Away</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Type
                      <select
                        className={inputClass}
                        value={g.type}
                        onChange={(e) =>
                          setGoals((prev) =>
                            prev.map((x, j) =>
                              j === i
                                ? { ...x, type: e.target.value as MatchLogGoal["type"] }
                                : x
                            )
                          )
                        }
                      >
                        <option value="goal">Open play</option>
                        <option value="penalty">Penalty</option>
                        <option value="own_goal">Own goal</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Scorer
                      <input
                        className={inputClass}
                        value={g.scorer_name}
                        onChange={(e) =>
                          setGoals((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, scorer_name: e.target.value } : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={Boolean(g.solo)}
                        onChange={(e) =>
                          setGoals((prev) =>
                            prev.map((x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    solo: e.target.checked,
                                    assist_name: e.target.checked ? "" : x.assist_name,
                                  }
                                : x
                            )
                          )
                        }
                      />
                      Solo (no assist)
                    </label>
                    {!g.solo && (
                      <label className="text-sm sm:col-span-2">
                        Assist
                        <input
                          className={inputClass}
                          value={g.assist_name ?? ""}
                          onChange={(e) =>
                            setGoals((prev) =>
                              prev.map((x, j) =>
                                j === i ? { ...x, assist_name: e.target.value } : x
                              )
                            )
                          }
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-red-600 sm:col-span-2"
                      onClick={() => setGoals((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove goal
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="rounded-lg border border-rule px-3 py-3 text-sm font-bold sm:py-2"
                  onClick={() => setGoals((prev) => [...prev, emptyGoal()])}
                >
                  + Add goal
                </button>
              </>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-extrabold">Bookings</h3>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={cardsNil}
                  onChange={(e) => {
                    setCardsNil(e.target.checked);
                    if (e.target.checked) setCards([]);
                  }}
                />
                Nil
              </label>
            </div>
            {!cardsNil && (
              <>
                {cards.map((c, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Minute
                      <input
                        className={inputClass}
                        value={c.minute}
                        onChange={(e) =>
                          setCards((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, minute: e.target.value } : x))
                          )
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Card
                      <select
                        className={inputClass}
                        value={c.type}
                        onChange={(e) =>
                          setCards((prev) =>
                            prev.map((x, j) =>
                              j === i
                                ? { ...x, type: e.target.value as MatchLogCard["type"] }
                                : x
                            )
                          )
                        }
                      >
                        <option value="yellow">Yellow</option>
                        <option value="red">Red</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Side
                      <select
                        className={inputClass}
                        value={c.side}
                        onChange={(e) =>
                          setCards((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, side: e.target.value as "home" | "away" } : x
                            )
                          )
                        }
                      >
                        <option value="home">Home</option>
                        <option value="away">Away</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Player
                      <input
                        className={inputClass}
                        value={c.player_name}
                        onChange={(e) =>
                          setCards((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, player_name: e.target.value } : x
                            )
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-red-600 sm:col-span-2"
                      onClick={() => setCards((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove card
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="rounded-lg border border-rule px-3 py-3 text-sm font-bold sm:py-2"
                  onClick={() => setCards((prev) => [...prev, emptyCard()])}
                >
                  + Add booking
                </button>
              </>
            )}
          </section>

          <label className="block text-sm">
            <span className="font-semibold">Notes</span>
            <textarea
              className={inputClass}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="btn-filled rounded-lg px-4 py-3 text-sm font-bold disabled:opacity-50 sm:py-2"
            >
              {busy ? "Saving…" : "Save log"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-rule px-4 py-3 text-sm font-bold sm:py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-display text-sm font-extrabold">Season logs</h3>
        <ul className="mt-2 divide-y divide-rule rounded-lg border border-rule">
          {logs.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-accent/60">
              No logs for this competition yet.
            </li>
          ) : (
            logs.map((log) => {
              const p = log.payload ?? {};
              const goalCount = p.goals_nil ? "Nil" : String(p.goals?.length ?? 0);
              const cardCount = p.cards_nil ? "Nil" : String(p.cards?.length ?? 0);
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => openLog(log)}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-wrapper sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-display text-sm font-bold">
                        {log.home_team_name ?? "Home"} {log.home_score ?? "–"}–
                        {log.away_score ?? "–"} {log.away_team_name ?? "Away"}
                      </p>
                      <p className="text-xs text-accent/60">
                        {log.scheduled_at
                          ? new Date(log.scheduled_at).toLocaleString()
                          : "No kick-off"}
                        {" · "}
                        Goals {goalCount}
                        {" · "}
                        Cards {cardCount}
                        {" · "}
                        GK {p.goalkeepers?.home?.player_name || "—"} /{" "}
                        {p.goalkeepers?.away?.player_name || "—"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-accent">Open</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
