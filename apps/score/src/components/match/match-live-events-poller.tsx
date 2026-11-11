"use client";

import { useEffect, useState } from "react";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { MatchEventsList } from "@/components/match/match-events-list";
import { FootballMatchTimeline } from "@/components/match/football-match-timeline";
import type { Match, PeriodScore } from "@/lib/types/database";
import type { SportId } from "@/lib/utils/sport";
import { clockFromServer, liveElapsedSeconds } from "@/lib/keeper/use-match-clock";

export type LiveSnapshot = {
  match: Match;
  events: DemoMatchEvent[];
  clockLabel: string;
  status: Match["status"];
};

/**
 * Polls match + events while a keeper is moderating so the public page
 * tracks scores, clock, corners, cards, etc. in near real time.
 */
export function MatchLiveEventsPoller({
  matchId,
  initialEvents,
  match: initialMatch,
  sport,
  periodScores,
  isCompleted: initialCompleted,
  onSnapshot,
}: {
  matchId: string;
  initialEvents: DemoMatchEvent[];
  match: Match;
  sport: SportId;
  periodScores: PeriodScore[];
  isCompleted: boolean;
  onSnapshot?: (snap: LiveSnapshot) => void;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [match, setMatch] = useState(initialMatch);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function tickOnce() {
      try {
        const res = await fetch(`/api/matches/${matchId}/live`);
        if (!res.ok) return;
        const json = (await res.json()) as { match?: Match; events?: DemoMatchEvent[] };
        if (cancelled || !json.match) return;
        setMatch(json.match);
        if (json.events) setEvents(json.events);
        const clock = clockFromServer(json.match);
        const elapsed = liveElapsedSeconds(clock);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        onSnapshot?.({
          match: json.match,
          events: json.events ?? [],
          clockLabel: `${m}:${s.toString().padStart(2, "0")}`,
          status: json.match.status,
        });
      } catch {
        /* ignore */
      }
    }
    void tickOnce();
    const id = setInterval(() => void tickOnce(), 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [matchId, onSnapshot]);

  // Local 1s refresh for published running clock between polls.
  useEffect(() => {
    if (!match.clock_is_running || match.clock_is_time_lost) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const schedule = () => {
      const delay = Math.max(50, 1000 - (Date.now() % 1000));
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setTick((t) => t + 1);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [match.clock_is_running, match.clock_is_time_lost, tick]);

  const completed = match.status === "completed" || initialCompleted;

  if (sport === "football") {
    return (
      <FootballMatchTimeline
        events={events}
        homeTeamId={match.home_team_id ?? ""}
        awayTeamId={match.away_team_id ?? ""}
        homeScore={match.home_score}
        awayScore={match.away_score}
        periodScores={periodScores}
        isCompleted={completed}
        sport={sport}
        boardedStoppageMinutes={match.clock_boarded_stoppage_minutes}
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
