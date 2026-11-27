import Link from "next/link";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { LineupPlayerBadges } from "@/components/match/lineup-player-badges";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import {
  getPitchLineup,
  resolvePitchSlotPlayer,
  type PitchLineupSlot,
  type TeamPitchLineup,
} from "@/lib/data/demo-lineups";
import { formationSlotPosition } from "@/lib/match/formation-layout";
import { buildLineupPlayerEvents } from "@/lib/match/lineup-player-events";
import type { Match, Player } from "@/lib/types/database";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

function playerFullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

export function FootballLineupPitch({
  match,
  events,
  sport,
  motmPlayerId,
  homeLineup: homeOverride,
  awayLineup: awayOverride,
  playersById,
}: {
  match: Match;
  events: DemoMatchEvent[];
  sport: SportId;
  motmPlayerId: string | null;
  /** Prefer DB / predicted XI over demo-only pitch maps. */
  homeLineup?: TeamPitchLineup | null;
  awayLineup?: TeamPitchLineup | null;
  playersById?: Map<string, Player> | Record<string, Player>;
}) {
  const homeLineup =
    homeOverride !== undefined
      ? homeOverride
      : match.home_team_id
        ? getPitchLineup(match.id, match.home_team_id)
        : null;
  const awayLineup =
    awayOverride !== undefined
      ? awayOverride
      : match.away_team_id
        ? getPitchLineup(match.id, match.away_team_id)
        : null;
  const matchStarted = match.status === "live" || match.status === "completed";

  if (!homeLineup && !awayLineup) {
    return (
      <p className="table-card px-4 py-8 text-center text-sm opacity-60">
        Lineups not available yet.
      </p>
    );
  }

  const isCompleted = match.status === "completed";
  const shared = {
    match,
    homeLineup,
    awayLineup,
    sport,
    events,
    matchStarted,
    motmPlayerId,
    isCompleted,
    playersById,
  };

  return (
    <>
      <div className="sm:hidden">
        <MobilePitchCard {...shared} />
      </div>
      <div className="hidden sm:block">
        <DesktopPitchCard {...shared} />
      </div>
    </>
  );
}

interface PitchCardProps {
  match: Match;
  homeLineup: TeamPitchLineup | null;
  awayLineup: TeamPitchLineup | null;
  sport: SportId;
  events: DemoMatchEvent[];
  matchStarted: boolean;
  motmPlayerId: string | null;
  isCompleted: boolean;
  playersById?: Map<string, Player> | Record<string, Player>;
}

/** Portrait pitch, teams stacked top/bottom — used on small screens. */
function MobilePitchCard({
  match,
  homeLineup,
  awayLineup,
  sport,
  events,
  matchStarted,
  motmPlayerId,
  isCompleted,
  playersById,
}: PitchCardProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {homeLineup && <TeamHeader team={match.home_team} sport={sport} formation={homeLineup.formation} />}

      <div className="relative aspect-[68/105] w-full bg-[#2d6a4f]">
        <PitchMarkings orientation="vertical" />

        {homeLineup && (
          <TeamOnPitch
            lineup={homeLineup}
            side="home"
            sport={sport}
            events={events}
            matchStarted={matchStarted}
            motmPlayerId={motmPlayerId}
            isCompleted={isCompleted}
            playersById={playersById}
          />
        )}
        {awayLineup && (
          <TeamOnPitch
            lineup={awayLineup}
            side="away"
            sport={sport}
            events={events}
            matchStarted={matchStarted}
            playersById={playersById}
            motmPlayerId={motmPlayerId}
            isCompleted={isCompleted}
          />
        )}
      </div>

      {awayLineup && (
        <TeamHeader team={match.away_team} sport={sport} formation={awayLineup.formation} align="right" />
      )}
    </div>
  );
}

/** Landscape pitch — compact field with side gutters for formation + kit. */
function DesktopPitchCard({
  match,
  homeLineup,
  awayLineup,
  sport,
  events,
  matchStarted,
  motmPlayerId,
  isCompleted,
  playersById,
}: PitchCardProps) {
  return (
    <div className="mx-auto max-w-[920px] overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3">
        <TeamHeaderDesktop team={match.home_team} sport={sport} />
        <TeamHeaderDesktop team={match.away_team} sport={sport} align="right" />
      </div>

      <div className="flex bg-white">
        <aside className="flex w-[72px] shrink-0 flex-col items-center justify-center gap-2 border-r border-rule px-2 py-4 sm:w-[88px]">
          {homeLineup && <FormationBadge formation={homeLineup.formation} kit="home" />}
        </aside>

        <div className="relative min-w-0 flex-1 aspect-[105/68] bg-[#2d6a4f]">
          <PitchMarkings orientation="horizontal" />

          {homeLineup && (
            <TeamOnPitch
              lineup={homeLineup}
              side="home"
              sport={sport}
              events={events}
              matchStarted={matchStarted}
              motmPlayerId={motmPlayerId}
              isCompleted={isCompleted}
              playersById={playersById}
              orientation="horizontal"
              compact
            />
          )}
          {awayLineup && (
            <TeamOnPitch
              lineup={awayLineup}
              side="away"
              sport={sport}
              events={events}
              matchStarted={matchStarted}
              motmPlayerId={motmPlayerId}
              isCompleted={isCompleted}
              playersById={playersById}
              orientation="horizontal"
              compact
            />
          )}
        </div>

        <aside className="flex w-[72px] shrink-0 flex-col items-center justify-center gap-2 border-l border-rule px-2 py-4 sm:w-[88px]">
          {awayLineup && <FormationBadge formation={awayLineup.formation} kit="away" />}
        </aside>
      </div>
    </div>
  );
}

function TeamHeader({
  team,
  sport,
  formation,
  align = "left",
}: {
  team: Match["home_team"];
  sport: SportId;
  formation: string;
  align?: "left" | "right";
}) {
  const code = team?.department?.short_code ?? "AU";
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-rule bg-white px-4 py-3",
        align === "right" && "flex-row-reverse border-b-0 border-t text-right"
      )}
    >
      <TeamCrest code={code} logoUrl={team?.logo_url} alt={team?.name ?? "Team"} size="sm" />
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-extrabold text-accent">{team?.name ?? "Team"}</p>
        <p className="text-xs text-accent/50">{formation}</p>
      </div>
      {team?.id && (
        <Link
          href={`/teams/${team.id}?sport=${sport}`}
          aria-label={`${team.name} club page`}
          className="ml-auto shrink-0 text-accent/40 hover:text-accent"
        >
          <InfoIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function TeamHeaderDesktop({
  team,
  sport,
  align = "left",
}: {
  team: Match["home_team"];
  sport: SportId;
  align?: "left" | "right";
}) {
  const code = team?.department?.short_code ?? "AU";
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "justify-end")}>
      <TeamCrest code={code} logoUrl={team?.logo_url} alt={team?.name ?? "Team"} size="sm" />
      <p className="truncate font-display text-sm font-extrabold text-accent">{team?.name ?? "Team"}</p>
      {team?.id && (
        <Link
          href={`/teams/${team.id}?sport=${sport}`}
          aria-label={`${team.name} club page`}
          className="shrink-0 text-accent/40 hover:text-accent"
        >
          <InfoIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function FormationBadge({
  formation,
  kit,
  light = false,
}: {
  formation: string;
  kit: "home" | "away";
  light?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p
        className={cn(
          "font-display text-xs font-extrabold tabular-nums",
          light ? "text-white/90" : "text-accent"
        )}
      >
        {formation}
      </p>
      <JerseyIcon className="h-6 w-6" kit={kit} />
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
      <path d="M8 7.2v4.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function JerseyIcon({ className, kit }: { className?: string; kit: "home" | "away" }) {
  const fill = kit === "home" ? "var(--accent)" : "#e5e7eb";
  const stroke = kit === "home" ? "var(--accent)" : "#9ca3af";
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        d="M5.2 1.5 1 3.6l1.3 2.6L4 5.4V14a.6.6 0 0 0 .6.6h6.8a.6.6 0 0 0 .6-.6V5.4l1.7.8L15 3.6l-4.2-2.1c-.3.9-1.4 1.6-2.8 1.6s-2.5-.7-2.8-1.6Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TeamOnPitch({
  lineup,
  side,
  sport,
  events,
  matchStarted,
  motmPlayerId,
  isCompleted,
  playersById,
  orientation = "vertical",
  compact = false,
}: {
  lineup: TeamPitchLineup;
  side: "home" | "away";
  sport: SportId;
  events: DemoMatchEvent[];
  matchStarted: boolean;
  motmPlayerId: string | null;
  isCompleted: boolean;
  playersById?: Map<string, Player> | Record<string, Player>;
  orientation?: "vertical" | "horizontal";
  compact?: boolean;
}) {
  const totalRows = lineup.rows.length;

  return (
    <>
      {lineup.rows.map((row, rowIndex) =>
        row.map((slot, colIndex) => {
          const player = resolvePitchSlotPlayer(slot, playersById);
          if (!player) return null;

          const rawPos = formationSlotPosition(
            side,
            rowIndex,
            colIndex,
            row.length,
            totalRows,
            lineup.formation,
            true
          );
          const pos =
            orientation === "horizontal"
              ? { left: rawPos.top, top: 100 - rawPos.left }
              : rawPos;
          const badges = buildLineupPlayerEvents(events, player.id, motmPlayerId, matchStarted);

          return (
            <div
              key={`${side}-${rowIndex}-${colIndex}-${slot.player_id}`}
              className="absolute z-[1] -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              <PitchPlayer
                player={player}
                slot={slot}
                sport={sport}
                badges={badges}
                showMotm={isCompleted}
                compact={compact}
              />
            </div>
          );
        })
      )}
    </>
  );
}

function PitchPlayer({
  player,
  slot,
  sport,
  badges,
  showMotm,
  compact = false,
}: {
  player: NonNullable<ReturnType<typeof resolvePitchSlotPlayer>>;
  slot: PitchLineupSlot;
  sport: SportId;
  badges: ReturnType<typeof buildLineupPlayerEvents>;
  showMotm: boolean;
  compact?: boolean;
}) {
  const name = playerFullName(player.first_name, player.last_name);
  const jersey = slot.jersey_number != null && slot.jersey_number > 0 ? slot.jersey_number : null;

  return (
    <Link
      href={`/players/${player.id}?sport=${sport}`}
      className={cn(
        "group flex flex-col items-center",
        compact ? "w-[52px]" : "w-[68px] sm:w-[74px]"
      )}
    >
      <div className={cn("relative mx-1 mb-0.5", compact ? "h-9 w-9" : "h-12 w-12")}>
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-white shadow-sm",
            compact ? "p-[2px]" : "p-[3px]",
            badges.redCard && "blur-[2px] brightness-75"
          )}
        >
          <div className="h-full w-full overflow-hidden rounded-full bg-white">
            <PlayerAvatar
              firstName={player.first_name}
              lastName={player.last_name}
              avatarUrl={player.avatar_url}
              size={compact ? "sm" : "md"}
            />
          </div>
        </div>
        <LineupPlayerBadges badges={badges} showMotm={showMotm} />
      </div>

      <p
        className={cn(
          "line-clamp-2 text-center font-display font-bold leading-tight text-white drop-shadow-sm group-hover:underline",
          compact
            ? "max-w-[56px] text-[8px]"
            : "max-w-[76px] text-[9px] sm:max-w-[84px] sm:text-[10px]"
        )}
      >
        {jersey != null ? <span className="opacity-80">{jersey} </span> : null}
        {name}
        {slot.is_captain ? " (c)" : ""}
      </p>
    </Link>
  );
}

/**
 * Full pitch markings — 68×105m, sharp rectangle, corner arcs inside touchlines.
 * Drawn once in portrait coordinates, rotated -90° for the landscape variant.
 */
function PitchMarkings({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const s = "rgba(255,255,255,0.38)";
  const w = 68;
  const h = 105;
  const mid = h / 2;
  const sw = 0.35;
  const penW = 40.32;
  const penH = 16.5;
  const sixW = 18.32;
  const sixH = 5.5;
  const penX = (w - penW) / 2;
  const sixX = (w - sixW) / 2;
  const circleR = 9.15;

  const content = (
    <>
      {/* Touchlines — flush to edges */}
      <rect x="0" y="0" width={w} height={h} fill="none" stroke={s} strokeWidth={sw} />

      {/* Halfway line */}
      <line x1="0" y1={mid} x2={w} y2={mid} stroke={s} strokeWidth={sw} />

      {/* Centre circle + spot */}
      <circle cx={w / 2} cy={mid} r={circleR} fill="none" stroke={s} strokeWidth={sw} />
      <circle cx={w / 2} cy={mid} r="0.6" fill={s} />

      {/* Top penalty area */}
      <rect x={penX} y="0" width={penW} height={penH} fill="none" stroke={s} strokeWidth={sw} />
      <rect x={sixX} y="0" width={sixW} height={sixH} fill="none" stroke={s} strokeWidth={sw} />
      <circle cx={w / 2} cy={11} r="0.6" fill={s} />
      <path
        d={`M ${w / 2 - circleR} ${penH} A ${circleR} ${circleR} 0 0 1 ${w / 2 + circleR} ${penH}`}
        fill="none"
        stroke={s}
        strokeWidth={sw}
      />

      {/* Bottom penalty area */}
      <rect x={penX} y={h - penH} width={penW} height={penH} fill="none" stroke={s} strokeWidth={sw} />
      <rect x={sixX} y={h - sixH} width={sixW} height={sixH} fill="none" stroke={s} strokeWidth={sw} />
      <circle cx={w / 2} cy={h - 11} r="0.6" fill={s} />
      <path
        d={`M ${w / 2 - circleR} ${h - penH} A ${circleR} ${circleR} 0 0 0 ${w / 2 + circleR} ${h - penH}`}
        fill="none"
        stroke={s}
        strokeWidth={sw}
      />

      {/* Corner arcs (1m radius) */}
      <path d="M 0 1 A 1 1 0 0 1 1 0" fill="none" stroke={s} strokeWidth={sw} />
      <path d={`M ${w - 1} 0 A 1 1 0 0 1 ${w} 1`} fill="none" stroke={s} strokeWidth={sw} />
      <path d={`M 0 ${h - 1} A 1 1 0 0 0 1 ${h}`} fill="none" stroke={s} strokeWidth={sw} />
      <path d={`M ${w - 1} ${h} A 1 1 0 0 0 ${w} ${h - 1}`} fill="none" stroke={s} strokeWidth={sw} />
    </>
  );

  if (orientation === "vertical") {
    return (
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        {content}
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${h} ${w}`}
      preserveAspectRatio="none"
    >
      <g transform={`translate(0, ${w}) rotate(-90)`}>{content}</g>
    </svg>
  );
}
