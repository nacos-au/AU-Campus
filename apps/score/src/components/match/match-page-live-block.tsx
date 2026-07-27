"use client";

import type { Match } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { MatchCountdown } from "@/components/match/match-countdown";
import { MatchLiveSection } from "@/components/match/match-live-section";
import { TeamCrest } from "@/components/ui/team-crest";
import { useMatchLifecycle } from "@/lib/match/use-match-lifecycle";
import { livePeriodLabel } from "@/lib/utils/sport-config";
import type { SportId } from "@/lib/utils/sport";
import { LiveBadge } from "@/components/layout/site-header";

export function MatchPageLiveBlock({
  match,
  events,
  sport,
  isEventSport,
}: {
  match: Match;
  events: DemoMatchEvent[];
  sport: SportId;
  isEventSport: boolean;
}) {
  const lifecycle = useMatchLifecycle(match.id, {
    status: match.status as "scheduled" | "live" | "completed",
    scheduledAt: match.scheduled_at,
  });

  if (isEventSport) {
    return (
      <div className="flex flex-col items-center gap-4">
        {lifecycle.isScheduled && (
          <MatchCountdown scheduledAt={match.scheduled_at} status={lifecycle.status} />
        )}
        {lifecycle.isLive && <LiveBadge />}
        <TeamCrest
          code={match.home_team?.department?.short_code ?? "AU"}
          logoUrl={match.home_team?.logo_url}
          alt={match.home_team?.name}
          size="lg"
        />
        <p className="font-display text-2xl font-bold">{match.home_team?.name}</p>
        {lifecycle.isLive && (
          <p className="text-sm opacity-70">{livePeriodLabel(sport, match.current_period)}</p>
        )}
      </div>
    );
  }

  return (
    <>
      {lifecycle.isScheduled && (
        <div className="mb-6 flex justify-center">
          <MatchCountdown scheduledAt={match.scheduled_at} status={lifecycle.status} />
        </div>
      )}
      <MatchLiveSection
        match={match}
        events={events}
        isLive={lifecycle.isLive}
        sport={sport}
      />
    </>
  );
}
