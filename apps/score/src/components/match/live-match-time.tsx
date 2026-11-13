"use client";

import { useEffect } from "react";
import { MatchTimeBar } from "@/components/match/match-time-bar";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import type { Match } from "@/lib/types/database";
import { clockFromServer, useMatchClock } from "@/lib/keeper/use-match-clock";
import type { SportId } from "@/lib/utils/sport";

export function LiveMatchTimeSection({
  matchId,
  sport,
  events,
  isLive,
  period,
  totalMinutes = 90,
  match,
}: {
  matchId: string;
  sport: SportId;
  events: DemoMatchEvent[];
  isLive: boolean;
  period: string;
  totalMinutes?: number;
  /** When provided, drives the bar from published server clock. */
  match?: Match;
}) {
  const initial = match ? clockFromServer(match) : { period };
  const { elapsedMinutes, formatTime, clock, applyServerClock } = useMatchClock(
    matchId,
    initial,
    { spectator: Boolean(match) }
  );

  useEffect(() => {
    if (!match) return;
    applyServerClock(clockFromServer(match));
  }, [
    applyServerClock,
    match,
    match?.clock_elapsed_seconds,
    match?.clock_is_running,
    match?.clock_running_started_at,
    match?.current_period,
  ]);

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
