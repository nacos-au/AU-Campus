"use client";

import type { Match, PeriodScore } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { TeamCrest } from "@/components/ui/team-crest";
import { MatchClockStatusBadge } from "@/components/match/match-clock-status-badge";
import { useMatchClock } from "@/lib/keeper/use-match-clock";
import { scoreClass } from "@/lib/match/score-highlight";
import { cn } from "@/lib/utils/cn";

export function BasketballMatchPanel({
  match,
  events,
  isLive,
  periodScores,
}: {
  match: Match;
  events: DemoMatchEvent[];
  isLive: boolean;
  periodScores: PeriodScore[];
}) {
  const { clock, formatTime } = useMatchClock(match.id, { period: match.current_period });
  const homeCode = match.home_team?.department?.short_code ?? "H";
  const awayCode = match.away_team?.department?.short_code ?? "A";
  const periodLabel = match.current_period.replace("quarter_", "Q").replace("_", " ").toUpperCase();

  const homeEvents = events.filter((e) => e.team_id === match.home_team_id).length;
  const awayEvents = events.filter((e) => e.team_id === match.away_team_id).length;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="branded-hero rounded-xl px-4 py-6 text-white sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          <TeamBlock name={match.home_team?.name ?? "Home"} code={homeCode} logo={match.home_team?.logo_url} align="left" />
          <div className="shrink-0 text-center">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-bold tabular-nums">
              {isLive ? `${periodLabel} · ${formatTime()}` : "Scheduled"}
            </span>
            <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
              <span className={cn("text-4xl sm:text-5xl", scoreClass(match.home_score, match.away_score, "home", "lg", "dark"))}>
                {match.home_score}
              </span>
              <span className="text-2xl opacity-40">:</span>
              <span className={cn("text-4xl sm:text-5xl", scoreClass(match.home_score, match.away_score, "away", "lg", "dark"))}>
                {match.away_score}
              </span>
            </div>
          </div>
          <TeamBlock name={match.away_team?.name ?? "Away"} code={awayCode} logo={match.away_team?.logo_url} align="right" />
        </div>
        {isLive && (
          <div className="mt-4 flex justify-center">
            <MatchClockStatusBadge
              isRunning={clock.isRunning}
              isTimeLost={clock.isTimeLost}
              clockOnLabel="Clock on"
              clockOffLabel="Time out"
            />
          </div>
        )}
      </div>

      {periodScores.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {periodScores.map((q) => (
            <div key={q.period} className="rounded-lg border border-rule bg-white px-2 py-3 text-center">
              <p className="text-[10px] font-bold uppercase opacity-50">{q.label}</p>
              <p className="mt-1 font-display text-sm font-extrabold tabular-nums">
                {q.home_score}–{q.away_score}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-rule bg-[#1a1a1a] px-4 py-5 text-white">
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-wider opacity-40">Scoring plays this half</p>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-display font-extrabold">{homeEvents}</p>
            <p className="text-xs opacity-50">{homeCode}</p>
          </div>
          <div>
            <p className="text-2xl font-display font-extrabold">{awayEvents}</p>
            <p className="text-xs opacity-50">{awayCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamBlock({
  name,
  code,
  logo,
  align,
}: {
  name: string;
  code: string;
  logo?: string | null;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2 sm:gap-3", align === "right" && "flex-row-reverse text-right")}>
      <TeamCrest code={code} logoUrl={logo} alt={name} size="md" />
      <p className="hidden truncate font-display text-sm font-bold sm:block">{name}</p>
      <p className="truncate font-display text-xs font-bold sm:hidden">{code}</p>
    </div>
  );
}
