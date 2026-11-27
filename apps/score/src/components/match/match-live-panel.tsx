"use client";

import { useEffect } from "react";
import { Circle, Flag, Target } from "lucide-react";
import { GiSoccerBall } from "react-icons/gi";
import type { Match } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { TeamCrest } from "@/components/ui/team-crest";
import { MatchStatusPill } from "@/components/match/match-status-pill";
import {
  clockFromServer,
  cumulativeCapSeconds,
  useMatchClock,
} from "@/lib/keeper/use-match-clock";
import type { LifecycleStatus } from "@/lib/match/use-match-lifecycle";
import { eventsToMarkers } from "@/lib/match/timeline";
import { explicitStatRows, type TeamStatRecord } from "@/lib/match/match-stats";
import { buildScorers, type ScorerLine } from "@/lib/match/scorers";
import { PARKED_FEATURES } from "@/lib/match/parked-features";
import { scoreClass } from "@/lib/match/score-highlight";
import { MatchStatsComparison } from "@/components/match/match-stats-comparison";
import { cn } from "@/lib/utils/cn";

const TICKS = [0, 15, 30, 45, 60, 75, 90];

/** Public stoppage badge only after regulation for that half (45' / 90' / ET). */
function showPublicAddedTime(
  elapsedSeconds: number,
  period: string,
  boardedMinutes: number
): boolean {
  if (boardedMinutes <= 0) return false;
  if (period === "half_time" || period === "full_time") return false;
  return elapsedSeconds >= cumulativeCapSeconds(period);
}

export function MatchLivePanel({
  match,
  events,
  status,
  liveTime,
  teamStats = [],
}: {
  match: Match;
  events: DemoMatchEvent[];
  status: LifecycleStatus;
  /** When provided (public poller), prefer over localStorage clock. */
  liveTime?: string;
  clockRunning?: boolean;
  clockTimeLost?: boolean;
  /** Explicit match_team_stats rows. The stats card only shows values recorded here. */
  teamStats?: TeamStatRecord[];
}) {
  const isLive = status === "live";
  const totalMinutes = match.went_to_extra_time ? 120 : 90;
  const serverClock = clockFromServer(match);
  const { elapsedMinutes, formatTime, clock, applyServerClock } = useMatchClock(
    match.id,
    serverClock,
    { spectator: true }
  );

  useEffect(() => {
    applyServerClock(clockFromServer(match));
  }, [
    applyServerClock,
    match.clock_elapsed_seconds,
    match.clock_is_running,
    match.clock_is_time_lost,
    match.clock_running_started_at,
    match.clock_stoppage_seconds,
    match.clock_boarded_stoppage_minutes,
    match.clock_time_lost_started_at,
    match.current_period,
  ]);

  const period = clock.period || match.current_period || "half_1";
  const isBreak =
    period === "half_time" ||
    period === "halftime" ||
    period === "full_time" ||
    status === "completed";
  const displayTime = liveTime ?? formatTime();
  const progress = Math.min(100, (elapsedMinutes / totalMinutes) * 100);
  const markers = eventsToMarkers(events, "football");
  const homeCode = match.home_team?.department?.short_code ?? "H";
  const awayCode = match.away_team?.department?.short_code ?? "A";
  const homeTeamId = match.home_team_id ?? "";
  const awayTeamId = match.away_team_id ?? "";
  const stats = explicitStatRows(teamStats, homeTeamId, awayTeamId);
  const scorers = buildScorers(events, homeTeamId, awayTeamId);
  const hasScorers = scorers.home.length > 0 || scorers.away.length > 0;
  const boarded = match.clock_boarded_stoppage_minutes ?? clock.boardedStoppageMinutes ?? 0;
  const showAdded = showPublicAddedTime(clock.elapsedSeconds, period, boarded);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="branded-hero rounded-xl px-4 py-6 text-white sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          <TeamBlock
            name={match.home_team?.name ?? "Home"}
            code={homeCode}
            logo={match.home_team?.logo_url}
            align="left"
          />
          <div className="shrink-0 text-center">
            <MatchStatusPill
              status={status}
              scheduledAt={match.scheduled_at}
              currentPeriod={period}
              sport="football"
              liveTime={isLive && !isBreak ? displayTime : undefined}
            />
            <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
              <span
                className={cn(
                  "text-4xl sm:text-5xl",
                  scoreClass(match.home_score, match.away_score, "home", "lg", "dark")
                )}
              >
                {match.home_score}
              </span>
              <span className="text-2xl opacity-40">:</span>
              <span
                className={cn(
                  "text-4xl sm:text-5xl",
                  scoreClass(match.home_score, match.away_score, "away", "lg", "dark")
                )}
              >
                {match.away_score}
              </span>
            </div>
            {isLive && showAdded && (
              <p className="mt-2 font-display text-sm font-extrabold tracking-wide text-white/80">
                +{boarded} added
              </p>
            )}
          </div>
          <TeamBlock
            name={match.away_team?.name ?? "Away"}
            code={awayCode}
            logo={match.away_team?.logo_url}
            align="right"
          />
        </div>

        {hasScorers && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-xs sm:text-sm">
            <ScorerList lines={scorers.home} align="left" />
            <ScorerList lines={scorers.away} align="right" />
          </div>
        )}
      </div>

      {!PARKED_FEATURES.minuteStrip && (
        <div className="mt-4 rounded-xl border border-rule bg-[#1a1a1a] px-3 py-4 text-white sm:px-5 sm:py-5">
          <div className="mb-3 flex justify-between text-[10px] font-bold uppercase tracking-wider opacity-40">
            <span>{homeCode}</span>
            <span>2×45 min</span>
            <span>{awayCode}</span>
          </div>

          <TimelineRow
            teamCode={homeCode}
            markers={markers.filter((m) => m.teamCode === homeCode)}
            totalMinutes={totalMinutes}
            row="top"
          />

          <div className="relative my-2 h-8">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
            {TICKS.map((t) => (
              <div
                key={t}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${(t / totalMinutes) * 100}%` }}
              >
                <div className="h-3 w-px bg-white/25" />
                <span className="mt-4 font-mono text-[10px] opacity-40">{t}</span>
              </div>
            ))}
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#004e28]"
              style={{ left: 0, width: `${progress}%` }}
            />
            {isLive && (
              <div
                className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{ left: `${progress}%` }}
              />
            )}
          </div>

          <TimelineRow
            teamCode={awayCode}
            markers={markers.filter((m) => m.teamCode === awayCode)}
            totalMinutes={totalMinutes}
            row="bottom"
          />
        </div>
      )}

      {stats.length > 0 && (
        <div className="mt-6 table-card p-4 sm:p-6">
          <MatchStatsComparison stats={stats} homeCode={homeCode} awayCode={awayCode} />
        </div>
      )}
    </div>
  );
}

function ScorerList({ lines, align }: { lines: ScorerLine[]; align: "left" | "right" }) {
  if (lines.length === 0) return <div />;
  return (
    <ul className={cn("min-w-0 space-y-1", align === "right" && "text-right")}>
      {lines.map((line) => (
        <li
          key={line.key}
          className={cn("flex min-w-0 items-center gap-1.5", align === "right" && "justify-end")}
        >
          {align === "left" && <GiSoccerBall className="h-3 w-3 shrink-0 opacity-80" aria-hidden />}
          <span className="truncate font-semibold">
            {line.name}
            {line.minutes.some((m) => m.label) && (
              <span className="ml-1 font-normal opacity-80">
                {line.minutes
                  .map((m) => `${m.label ?? ""}${m.tag ? ` (${m.tag})` : ""}`.trim())
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </span>
          {align === "right" && <GiSoccerBall className="h-3 w-3 shrink-0 opacity-80" aria-hidden />}
        </li>
      ))}
    </ul>
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
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 sm:gap-3",
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      <TeamCrest code={code} logoUrl={logo} alt={name} size="md" />
      <p className="hidden truncate font-display text-sm font-bold sm:block">{name}</p>
      <p className="truncate font-display text-xs font-bold sm:hidden">{code}</p>
    </div>
  );
}

function TimelineRow({
  markers,
  totalMinutes,
  row,
}: {
  teamCode: string;
  markers: ReturnType<typeof eventsToMarkers>;
  totalMinutes: number;
  row: "top" | "bottom";
}) {
  return (
    <div className={cn("relative h-6", row === "bottom" && "mt-1")}>
      {markers.map((m) => {
        const left = `${Math.min(98, Math.max(2, (m.minute / totalMinutes) * 100))}%`;
        const Icon =
          m.type.includes("goal") || m.type.includes("penalty_scored")
            ? null
            : m.type.includes("card") || m.type.includes("yellow") || m.type.includes("red")
              ? Flag
              : m.type.includes("offside")
                ? Circle
                : Target;
        const color = m.type.includes("yellow")
          ? "text-yellow-400"
          : m.type.includes("red")
            ? "text-red-500"
            : "text-white";
        return (
          <div
            key={m.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left }}
            title={`${m.minute}' ${m.label}`}
          >
            {Icon ? (
              <Icon className={cn("h-4 w-4", color)} strokeWidth={2.5} />
            ) : (
              <span className="text-sm leading-none">⚽</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
