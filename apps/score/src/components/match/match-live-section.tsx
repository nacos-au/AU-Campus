import type { Match } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { MatchLivePanel } from "@/components/match/match-live-panel";
import { BasketballMatchPanel } from "@/components/match/basketball-match-panel";
import { VolleyballMatchPanel } from "@/components/match/volleyball-match-panel";
import { TennisMatchPanel } from "@/components/match/tennis-match-panel";
import type { SportId } from "@/lib/utils/sport";
import type { TeamStatRecord } from "@/lib/match/match-stats";
import type { LifecycleStatus } from "@/lib/match/use-match-lifecycle";
import { getPeriodScoresForMatch, getSetScoresForMatch } from "@/lib/data/demo-match-details";

export function MatchLiveSection({
  match,
  events,
  teamStats,
  status,
  sport,
  liveTime,
  clockRunning,
  clockTimeLost,
}: {
  match: Match;
  events: DemoMatchEvent[];
  teamStats?: TeamStatRecord[];
  status: LifecycleStatus;
  sport: SportId;
  liveTime?: string;
  clockRunning?: boolean;
  clockTimeLost?: boolean;
}) {
  if (sport === "football") {
    return (
      <div className="mt-8">
        <MatchLivePanel
          match={match}
          events={events}
          teamStats={teamStats}
          status={status}
          liveTime={liveTime}
          clockRunning={clockRunning}
          clockTimeLost={clockTimeLost}
        />
      </div>
    );
  }

  if (sport === "basketball") {
    return (
      <div className="mt-8">
        <BasketballMatchPanel
          match={match}
          events={events}
          status={status}
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
          status={status}
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
          status={status}
          setScores={getSetScoresForMatch(match.id)}
        />
      </div>
    );
  }

  return null;
}
