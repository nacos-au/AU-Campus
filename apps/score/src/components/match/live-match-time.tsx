"use client";

import { MatchTimeBar } from "@/components/match/match-time-bar";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { useMatchClock } from "@/lib/keeper/use-match-clock";
import type { SportId } from "@/lib/utils/sport";

export function LiveMatchTimeSection({
  matchId,
  sport,
  events,
  isLive,
  period,
  totalMinutes = 90,
}: {
  matchId: string;
  sport: SportId;
  events: DemoMatchEvent[];
  isLive: boolean;
  period: string;
  totalMinutes?: number;
}) {
  const { elapsedMinutes, formatTime, clock } = useMatchClock(matchId, { period });

  if (!isLive && sport !== "football") return null;

  return (
    <div className="mt-6 border-t border-rule pt-6">
      <p className="mb-3 text-center font-display text-xs font-extrabold uppercase tracking-wide opacity-50">
        Match time
      </p>
      <MatchTimeBar
        sport={sport}
        events={events}
        elapsedMinutes={elapsedMinutes}
        totalMinutes={matchId === "match-15" ? 120 : totalMinutes}
        period={clock.period || period}
        isLive={isLive && clock.isRunning}
      />
      {isLive && sport === "football" && (
        <p className="mt-2 text-center font-mono text-sm opacity-60">{formatTime()} elapsed</p>
      )}
    </div>
  );
}
