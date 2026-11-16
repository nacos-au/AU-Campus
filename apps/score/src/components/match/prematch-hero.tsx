"use client";

import type { Match } from "@/lib/types/database";
import { TeamCrest } from "@/components/ui/team-crest";
import { MatchStatusPill } from "@/components/match/match-status-pill";
import type { SportId } from "@/lib/utils/sport";

/** Pre-kickoff scoreboard: teams + kickoff/countdown pill only (no 0–0 / timeline). */
export function PrematchHero({
  match,
  sport,
}: {
  match: Match;
  sport: SportId;
}) {
  const homeCode = match.home_team?.department?.short_code ?? "H";
  const awayCode = match.away_team?.department?.short_code ?? "A";

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl">
      <div className="branded-hero rounded-xl px-4 py-8 text-white sm:px-8 sm:py-10">
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamCrest
              code={homeCode}
              logoUrl={match.home_team?.logo_url}
              alt={match.home_team?.name ?? "Home"}
              size="lg"
            />
            <p className="line-clamp-2 font-display text-sm font-extrabold sm:text-base">
              {match.home_team?.name ?? "Home"}
            </p>
          </div>

          <div className="shrink-0 text-center">
            <MatchStatusPill
              status="scheduled"
              scheduledAt={match.scheduled_at}
              currentPeriod={match.current_period ?? "not_started"}
              sport={sport}
            />
            <p className="mt-3 font-display text-xs font-semibold uppercase tracking-wide text-white/55">
              vs
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamCrest
              code={awayCode}
              logoUrl={match.away_team?.logo_url}
              alt={match.away_team?.name ?? "Away"}
              size="lg"
            />
            <p className="line-clamp-2 font-display text-sm font-extrabold sm:text-base">
              {match.away_team?.name ?? "Away"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
