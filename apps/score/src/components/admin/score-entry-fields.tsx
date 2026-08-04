"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { SportId } from "@/lib/utils/sport";

export interface ScoreEntryValue {
  home_score: number;
  away_score: number;
  set_scores?: { set_number: number; home_games: number; away_games: number }[];
}

/**
 * Final-score input, adapted per sport: a plain home/away tally for
 * football & basketball, or a repeatable set-by-set score list for tennis
 * & volleyball (sets won is derived automatically).
 */
export function ScoreEntryFields({
  sport,
  homeLabel,
  awayLabel,
  onChange,
}: {
  sport: SportId;
  homeLabel: string;
  awayLabel: string;
  onChange: (value: ScoreEntryValue) => void;
}) {
  const usesSets = sport === "tennis" || sport === "volleyball";

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [sets, setSets] = useState([{ home_games: 0, away_games: 0 }]);

  useEffect(() => {
    if (!usesSets) {
      onChange({ home_score: homeScore, away_score: awayScore });
      return;
    }
    const home_score = sets.filter((s) => s.home_games > s.away_games).length;
    const away_score = sets.filter((s) => s.away_games > s.home_games).length;
    onChange({
      home_score,
      away_score,
      set_scores: sets.map((s, i) => ({ set_number: i + 1, ...s })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesSets, homeScore, awayScore, sets]);

  if (!usesSets) {
    return (
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
