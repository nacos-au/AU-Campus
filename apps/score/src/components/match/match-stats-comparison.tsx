"use client";

import type { MatchStatRow } from "@/lib/match/match-stats";
import { cn } from "@/lib/utils/cn";

export function MatchStatsComparison({
  stats,
  homeCode,
  awayCode,
}: {
  stats: MatchStatRow[];
  homeCode: string;
  awayCode: string;
}) {
  if (stats.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide opacity-50">
        <span>{homeCode}</span>
        <span>Match stats</span>
        <span>{awayCode}</span>
      </div>
      {stats.map((row) => (
        <StatBar key={row.label} row={row} />
      ))}
    </div>
  );
}

function StatBar({ row }: { row: MatchStatRow }) {
  const home = row.home ?? 0;
  const away = row.away ?? 0;
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  const awayPct = (away / total) * 100;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-display text-sm font-bold tabular-nums">
        <span className={cn(home >= away && home > 0 && "text-accent")}>{row.home ?? "–"}</span>
        <span className="text-xs font-semibold uppercase opacity-50">{row.label}</span>
        <span className={cn(away >= home && away > 0 && "text-accent")}>{row.away ?? "–"}</span>
      </div>
      <div className="flex h-2 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-[#004e28] transition-all"
            style={{ width: `${homePct}%` }}
          />
        </div>
        <div className="flex flex-1 justify-start overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-accent/70 transition-all"
            style={{ width: `${awayPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
