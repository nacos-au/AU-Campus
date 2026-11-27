import Link from "next/link";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import type { PeriodScore } from "@/lib/types/database";
import {
  GoalBallIcon,
  PenaltyGoalIcon,
  RedCardIcon,
  SubstitutionIcon,
  YellowCardIcon,
} from "@/components/match/match-event-icons";
import {
  buildFootballTimeline,
  playerShortName,
  type TimelineItem,
} from "@/lib/match/football-timeline";
import { displayMatchTime } from "@/lib/match/timeline";
import type { SportId } from "@/lib/utils/sport";
import { PlayerName, NameModeToggle } from "@/components/ui/player-name";
import type { NameParts } from "@/lib/players/display-name";
import { cn } from "@/lib/utils/cn";

export function FootballMatchTimeline({
  events,
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  periodScores,
  isCompleted,
  sport,
  boardedStoppageMinutes,
}: {
  events: DemoMatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  periodScores: PeriodScore[];
  isCompleted: boolean;
  sport: SportId;
  boardedStoppageMinutes?: number | null;
}) {
  const items = buildFootballTimeline(
    events,
    homeTeamId,
    periodScores,
    homeScore,
    awayScore,
    isCompleted,
    { boardedStoppageMinutes }
  );

  if (items.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-display text-xl font-extrabold">Match Events</h2>
        <div className="table-card p-8 text-center text-sm opacity-70">No events yet</div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold">Match Events</h2>
        {events.some((e) => e.player?.nickname?.trim()) && <NameModeToggle />}
      </div>
      <div className="table-card px-3 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          {items.map((item) => {
            if (item.kind === "divider") {
              return <TimelineDivider key={item.id} label={item.label} />;
            }
            if (item.kind === "added_time") {
              return (
                <div key={item.id} className="flex justify-center py-1">
                  <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-accent/60">
                    Additional time {item.minutes}
                  </span>
                </div>
              );
            }
            return (
              <div key={item.id} className="flex min-h-[48px] w-full items-center gap-2 sm:gap-4">
                <div className="flex min-h-[48px] min-w-0 flex-1 items-center">
                  {item.side === "home" && (
                    <TimelineEventRow item={item} sport={sport} isHome />
                  )}
                </div>
                <div className="flex min-h-[48px] min-w-0 flex-1 items-center justify-end">
                  {item.side === "away" && (
                    <TimelineEventRow item={item} sport={sport} isHome={false} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimelineDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-rule" />
      <span className="shrink-0 font-display text-xs font-extrabold tracking-wide text-accent/70">
        {label}
      </span>
      <div className="h-px flex-1 bg-rule" />
    </div>
  );
}

function TimelineEventRow({
  item,
  sport,
  isHome,
}: {
  item: Extract<TimelineItem, { kind: "event" }>;
  sport: SportId;
  isHome: boolean;
}) {
  const { event, scoreLabel } = item;
  const isSub = event.event_type === "substitution";
  const isCard = event.event_type.includes("card");
  const isTeamAction =
    ["corner", "foul", "offside", "shot_on_target"].includes(event.event_type) && !event.player.id;
  const isDisallowed =
    event.event_type === "disallowed_goal" || event.event_type === "disallowed";
  const shortName = playerShortName(event.player.first_name, event.player.last_name);
  const hasPlayerName = Boolean(
    (event.player.first_name ?? "").trim() || (event.player.last_name ?? "").trim()
  );
  const playerName = isTeamAction
    ? event.team_name || eventTypeLabel(event.event_type)
    : hasPlayerName
      ? shortName
      : "";
  const assistName =
    event.details?.assist_player_name != null
      ? String(event.details.assist_player_name)
      : null;
  const outName =
    event.details?.player_out_name != null ? String(event.details.player_out_name) : null;
  const inName =
    event.details?.player_in_name != null ? String(event.details.player_in_name) : null;
  const foulLabel =
    event.details?.foul_label != null ? String(event.details.foul_label) : "Foul";
  const actionLabel = isTeamAction
    ? eventTypeLabel(event.event_type)
    : isDisallowed
      ? "Disallowed"
      : event.event_type === "own_goal"
        ? "OG"
        : event.event_type === "shot_on_target"
          ? "SOT"
          : !hasPlayerName &&
              (event.event_type === "goal" || event.event_type === "penalty_scored")
            ? eventTypeLabel(event.event_type)
            : undefined;
  const secondary = isSub
    ? inName
      ? `${outName ?? playerName} → ${inName}`
      : outName
    : assistName ?? actionLabel;

  const nameParts: NameParts | undefined =
    !isTeamAction && !(isSub && outName) && hasPlayerName ? event.player : undefined;
  const icon = <EventIcon event={event} />;
  const matchTimeLabel = displayMatchTime(event.match_time, "football");
  const time = matchTimeLabel ? (
    <span className="w-11 shrink-0 font-display text-xs font-bold tabular-nums text-accent sm:w-12 sm:text-sm">
      {matchTimeLabel}
    </span>
  ) : null;

  if (isHome) {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-start gap-x-2 gap-y-1">
        {time}
        {icon}
        {scoreLabel && <ScoreBadge score={scoreLabel} />}
        <PlayerBlock
          sport={sport}
          playerId={event.player.id}
          primary={isSub && outName ? outName : playerName}
          nameParts={nameParts}
          secondary={secondary}
          secondaryMuted={isSub || Boolean(assistName) || Boolean(actionLabel)}
          trailing={isCard ? foulLabel : undefined}
          trailingBefore={false}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right">
      <PlayerBlock
        sport={sport}
        playerId={event.player.id}
        primary={isSub && outName ? outName : playerName}
        nameParts={nameParts}
        secondary={secondary}
        secondaryMuted={isSub || Boolean(assistName) || Boolean(actionLabel)}
        trailing={isCard ? foulLabel : undefined}
        trailingBefore
        align="right"
      />
      {scoreLabel && <ScoreBadge score={scoreLabel} />}
      {icon}
      {time}
    </div>
  );
}

function PlayerBlock({
  sport,
  playerId,
  primary,
  nameParts,
  secondary,
  secondaryMuted,
  trailing,
  trailingBefore = false,
  align = "left",
}: {
  sport: SportId;
  playerId: string;
  primary: string;
  /** When set, the primary name follows the viewer's legal/nickname choice. */
  nameParts?: NameParts;
  secondary?: string | null;
  secondaryMuted?: boolean;
  trailing?: string;
  trailingBefore?: boolean;
  align?: "left" | "right";
}) {
  const primaryLabel = primary.trim();
  return (
    <div className={cn("min-w-0 text-xs sm:text-sm", align === "right" ? "text-right" : "text-left")}>
      {trailing && trailingBefore && (
        <span className="mr-1.5 text-accent/50">{trailing}</span>
      )}
      {primaryLabel ? (
        playerId ? (
          <Link href={`/players/${playerId}?sport=${sport}`} className="font-display font-bold text-accent hover:underline">
            {nameParts ? <PlayerName player={nameParts} short /> : primaryLabel}
          </Link>
        ) : (
          <span className="font-display font-bold text-accent">
            {nameParts ? <PlayerName player={nameParts} short /> : primaryLabel}
          </span>
        )
      ) : null}
      {secondary && (
        <span
          className={cn(
            primaryLabel ? "ml-1.5" : undefined,
            secondaryMuted ? "text-accent/40" : "text-accent/60"
          )}
        >
          {secondary}
        </span>
      )}
      {trailing && !trailingBefore && (
        <span className="ml-1.5 text-accent/50">{trailing}</span>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-accent/30 bg-white px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-accent sm:text-xs">
      {score}
    </span>
  );
}

function eventTypeLabel(type: string): string {
  switch (type) {
    case "corner":
      return "Corner";
    case "offside":
      return "Offside";
    case "foul":
      return "Foul";
    case "save":
      return "Save";
    case "warning":
      return "Warning";
    case "penalty_missed":
      return "Pen miss";
    case "own_goal":
      return "OG";
    case "shot_on_target":
      return "SOT";
    case "disallowed_goal":
    case "disallowed":
      return "Disallowed";
    default:
      return type.replace(/_/g, " ");
  }
}

function EventIcon({ event }: { event: DemoMatchEvent }) {
  const cls = "h-4 w-4 shrink-0 text-accent sm:h-5 sm:w-5";
  switch (event.event_type) {
    case "goal":
      return <GoalBallIcon className={cls} />;
    case "own_goal":
      return <GoalBallIcon className={cn(cls, "opacity-70")} />;
    case "disallowed_goal":
    case "disallowed":
      return (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-400/60 font-display text-[8px] font-extrabold text-red-700 line-through">
          G
        </span>
      );
    case "penalty_scored":
      return <PenaltyGoalIcon className={cls} />;
    case "penalty_missed":
      return <PenaltyGoalIcon className={cn(cls, "opacity-50")} />;
    case "substitution":
      return <SubstitutionIcon className="shrink-0" />;
    case "yellow_card":
      return <YellowCardIcon />;
    case "red_card":
      return <RedCardIcon />;
    case "corner":
      return (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-[9px] font-extrabold">
          C
        </span>
      );
    case "offside":
      return (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-[9px] font-extrabold">
          OS
        </span>
      );
    case "save":
      return (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-[9px] font-extrabold">
          SV
        </span>
      );
    case "shot_on_target":
      return (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-[9px] font-extrabold">
          ST
        </span>
      );
    case "foul":
    case "warning":
      return (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-[9px] font-extrabold">
          F
        </span>
      );
    default:
      return (
        <span
          className="inline-flex max-w-[4.5rem] shrink-0 truncate rounded-full border border-accent/30 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase"
          title={eventTypeLabel(event.event_type)}
        >
          {eventTypeLabel(event.event_type)}
        </span>
      );
  }
}
