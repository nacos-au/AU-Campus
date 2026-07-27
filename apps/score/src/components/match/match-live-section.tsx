"use client";

import type { Match } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { MatchLivePanel } from "@/components/match/match-live-panel";
import { BasketballMatchPanel } from "@/components/match/basketball-match-panel";
import { VolleyballMatchPanel } from "@/components/match/volleyball-match-panel";
import { TennisMatchPanel } from "@/components/match/tennis-match-panel";
import type { SportId } from "@/lib/utils/sport";
import { getPeriodScoresForMatch, getSetScoresForMatch } from "@/lib/data/demo-match-details";

export function MatchLiveSection({
  match,
  events,
  isLive,
  sport,
}: {
  match: Match;
  events: DemoMatchEvent[];
  isLive: boolean;
  sport: SportId;
}) {
  if (sport === "football") {
    return (
      <div className="mt-8">
        <MatchLivePanel match={match} events={events} isLive={isLive} />
      </div>
    );
  }

  if (sport === "basketball") {
    return (
      <div className="mt-8">
        <BasketballMatchPanel
          match={match}
          events={events}
          isLive={isLive}
          periodScores={getPeriodScoresForMatch(match.id)}
        />
      </div>
    );
  }

  if (sport === "volleyball") {
    return (
      <div className="mt-8">
        <VolleyballMatchPanel
          match={match}
          events={events}
          isLive={isLive}
          setScores={getSetScoresForMatch(match.id)}
        />
      </div>
    );
  }

  if (sport === "tennis") {
    return (
      <div className="mt-8">
        <TennisMatchPanel
          match={match}
          events={events}
          isLive={isLive}
          setScores={getSetScoresForMatch(match.id)}
        />
      </div>
    );
  }

  return null;
}
