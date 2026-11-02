"use client";

import { useEffect, useState } from "react";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { MatchEventsList } from "@/components/match/match-events-list";
import { FootballMatchTimeline } from "@/components/match/football-match-timeline";
import type { Match, PeriodScore } from "@/lib/types/database";
import type { SportId } from "@/lib/utils/sport";

/**
 * Polls match events while live so the public page tracks the keeper console.
 */
export function MatchLiveEventsPoller({
  matchId,
  initialEvents,
  match,
  sport,
  periodScores,
  isCompleted,
}: {
  matchId: string;
  initialEvents: DemoMatchEvent[];
  match: Match;
  sport: SportId;
  periodScores: PeriodScore[];
  isCompleted: boolean;
}) {
  const [events, setEvents] = useState(initialEvents);
  const isLive = match.status === "live";

  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/matches/${matchId}/events`);
        if (!res.ok) return;
        const json = (await res.json()) as { events?: DemoMatchEvent[] };
        if (!cancelled && json.events) setEvents(json.events);
      } catch {
        /* ignore */
      }
    }
    void tick();
    const id = setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLive, matchId]);

  if (sport === "football") {
    return (
      <FootballMatchTimeline
        events={events}
        homeTeamId={match.home_team_id ?? ""}
        awayTeamId={match.away_team_id ?? ""}
        homeScore={match.home_score}
        awayScore={match.away_score}
        periodScores={periodScores}
        isCompleted={isCompleted}
        sport={sport}
      />
    );
  }

  return (
    <MatchEventsList
      events={events}
      sport={sport}
      title="Match Events"
    />
  );
}
