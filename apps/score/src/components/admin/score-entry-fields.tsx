"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { SportId } from "@/lib/utils/sport";

export interface ScoreEntryValue {
  home_score: number;
  away_score: number;
  home_penalties?: number | null;
  away_penalties?: number | null;
  set_scores?: { set_number: number; home_games: number; away_games: number }[];
}

/**
 * Final-score input, adapted per sport: a plain home/away tally for
 * football & basketball, or a repeatable set-by-set score list for tennis
 * & volleyball (sets won is derived automatically).
 * Football can optionally record a penalty shootout.
 */
export function ScoreEntryFields({
  sport,
  homeLabel,
  awayLabel,
  onChange,
  allowPenalties = true,
}: {
  sport: SportId;
  homeLabel: string;
  awayLabel: string;
  onChange: (value: ScoreEntryValue) => void;
  allowPenalties?: boolean;
}) {
  const usesSets = sport === "tennis" || sport === "volleyball";
  const showPens = allowPenalties && sport === "football";

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [wentToPens, setWentToPens] = useState(false);
  const [homePens, setHomePens] = useState(0);
  const [awayPens, setAwayPens] = useState(0);
  const [sets, setSets] = useState([{ home_games: 0, away_games: 0 }]);

  useEffect(() => {
    if (!usesSets) {
      onChange({
        home_score: homeScore,
        away_score: awayScore,
        home_penalties: showPens && wentToPens ? homePens : null,
        away_penalties: showPens && wentToPens ? awayPens : null,
      });
      return;
    }
    const home_score = sets.filter((s) => s.home_games > s.away_games).length;
    const away_score = sets.filter((s) => s.away_games > s.home_games).length;
    onChange({
      home_score,
      away_score,
      home_penalties: null,
      away_penalties: null,
      set_scores: sets.map((s, i) => ({ set_number: i + 1, ...s })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesSets, homeScore, awayScore, sets, showPens, wentToPens, homePens, awayPens]);

  if (!usesSets) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="font-semibold">{homeLabel}</span>
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">{awayLabel}</span>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            />
          </label>
        </div>

        {showPens && (
          <div className="rounded-xl border border-rule bg-wrapper/60 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={wentToPens}
                onChange={(e) => setWentToPens(e.target.checked)}
              />
              Decided on penalties
            </label>
            {wentToPens && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-semibold">Pens · {homeLabel}</span>
                  <input
                    type="number"
                    min={0}
                    value={homePens}
                    onChange={(e) => setHomePens(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Pens · {awayLabel}</span>
                  <input
                    type="number"
                    min={0}
                    value={awayPens}
                    onChange={(e) => setAwayPens(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function updateSet(i: number, patch: Partial<{ home_games: number; away_games: number }>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">
        Set scores <span className="font-normal opacity-60">({homeLabel} vs {awayLabel})</span>
      </p>
      {sets.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-xs font-bold opacity-50">Set {i + 1}</span>
          <input
            type="number"
            min={0}
            value={s.home_games}
            onChange={(e) => updateSet(i, { home_games: Number(e.target.value) })}
            className="w-16 rounded-lg border border-rule px-2 py-1.5 text-center"
          />
          <span className="opacity-40">–</span>
          <input
            type="number"
            min={0}
            value={s.away_games}
            onChange={(e) => updateSet(i, { away_games: Number(e.target.value) })}
            className="w-16 rounded-lg border border-rule px-2 py-1.5 text-center"
          />
          {sets.length > 1 && (
            <button
              type="button"
              onClick={() => setSets((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove set"
              className="text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSets((prev) => [...prev, { home_games: 0, away_games: 0 }])}
        className="interactive-btn inline-flex items-center gap-1 rounded-lg border border-dashed border-rule px-3 py-1.5 text-xs font-bold"
      >
        <Plus className="h-3.5 w-3.5" /> Add set
      </button>
    </div>
  );
}
