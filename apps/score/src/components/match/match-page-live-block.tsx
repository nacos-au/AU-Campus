"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { MatchLiveSection } from "@/components/match/match-live-section";
import { TeamCrest } from "@/components/ui/team-crest";
import { useMatchLifecycle } from "@/lib/match/use-match-lifecycle";
import { livePeriodLabel } from "@/lib/utils/sport-config";
import type { SportId } from "@/lib/utils/sport";
import { LiveBadge } from "@/components/layout/section-title";
import {
  clockFromServer,
  useMatchClock,
} from "@/lib/keeper/use-match-clock";

export function MatchPageLiveBlock({
  match: initialMatch,
  events: initialEvents,
  sport,
  isEventSport,
}: {
  match: Match;
  events: DemoMatchEvent[];
  sport: SportId;
  isEventSport: boolean;
}) {
  const [match, setMatch] = useState(initialMatch);
  const [events, setEvents] = useState(initialEvents);
  const lifecycle = useMatchLifecycle(initialMatch.id, {
    status: initialMatch.status as "scheduled" | "live" | "completed",
    scheduledAt: initialMatch.scheduled_at,
  });
  const { reconcileFromServer } = lifecycle;

  const serverClock = clockFromServer(match);
  const { formatTime, applyServerClock } = useMatchClock(match.id, serverClock, {
    spectator: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${initialMatch.id}/live`);
      if (!res.ok) return;
      const json = (await res.json()) as { match?: Match; events?: DemoMatchEvent[] };
      if (!json.match) return;
      setMatch(json.match);
      if (json.events) setEvents(json.events);
      applyServerClock(clockFromServer(json.match));
      reconcileFromServer(json.match.status as "scheduled" | "live" | "completed");
    } catch {
      /* ignore */
    }
  }, [applyServerClock, initialMatch.id, reconcileFromServer]);

  useEffect(() => {
    if (match.status === "completed") return;
    // Poll whenever not completed so a kickoff is picked up without a full refresh.
    void refresh();
    const id = setInterval(() => void refresh(), 2500);
    return () => clearInterval(id);
  }, [match.status, refresh]);

  const status =
    match.status === "live" || match.status === "completed" || match.status === "scheduled"
      ? match.status
      : lifecycle.status;

  if (isEventSport) {
    return (
      <div className="flex flex-col items-center gap-4">
        {status === "live" && <LiveBadge />}
        <TeamCrest
          code={match.home_team?.department?.short_code ?? "AU"}
          logoUrl={match.home_team?.logo_url}
          alt={match.home_team?.name}
          size="lg"
        />
        <p className="font-display text-2xl font-bold">{match.home_team?.name}</p>
        {status === "live" && (
          <p className="text-sm opacity-70">{livePeriodLabel(sport, match.current_period)}</p>
        )}
      </div>
    );
  }

  return (
    <MatchLiveSection
      match={match}
      events={events}
      status={status}
      sport={sport}
      liveTime={status === "live" ? formatTime() : undefined}
    />
  );
}
