import Link from "next/link";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { LineupPlayerBadges } from "@/components/match/lineup-player-badges";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { getPitchLineup, resolvePitchSlotPlayer, type PitchLineupSlot, type TeamPitchLineup } from "@/lib/data/demo-lineups";
import { formationSlotPosition } from "@/lib/match/formation-layout";
import { buildLineupPlayerEvents } from "@/lib/match/lineup-player-events";
import type { Match } from "@/lib/types/database";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

function playerShortName(first: string, last: string): string {
  return `${first[0]}. ${last}`;
}

export function FootballLineupPitch({
  match,
  events,
  sport,
  motmPlayerId,
}: {
  match: Match;
  events: DemoMatchEvent[];
  sport: SportId;
  motmPlayerId: string | null;
}) {
  const homeLineup = match.home_team_id ? getPitchLineup(match.id, match.home_team_id) : null;
  const awayLineup = match.away_team_id ? getPitchLineup(match.id, match.away_team_id) : null;
  const matchStarted = match.status === "live" || match.status === "completed";

  if (!homeLineup && !awayLineup) {
    return (
      <p className="table-card px-4 py-8 text-center text-sm opacity-60">
        Lineups not available yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {homeLineup && <TeamHeader team={match.home_team} formation={homeLineup.formation} />}

      <div className="relative aspect-[68/105] w-full bg-[#2d6a4f]">
        <FullPitchMarkings />

        {homeLineup && (
          <TeamOnPitch
            lineup={homeLineup}
            side="home"
            sport={sport}
            events={events}
            matchStarted={matchStarted}
            motmPlayerId={motmPlayerId}
            isCompleted={match.status === "completed"}
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
            isCompleted={match.status === "completed"}
          />
        )}
      </div>

      {awayLineup && (
        <TeamHeader team={match.away_team} formation={awayLineup.formation} align="right" />
      )}
    </div>
  );
}

function TeamHeader({
  team,
  formation,
  align = "left",
}: {
  team: Match["home_team"];
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
    </div>
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
}: {
  lineup: TeamPitchLineup;
  side: "home" | "away";
  sport: SportId;
  events: DemoMatchEvent[];
  matchStarted: boolean;
  motmPlayerId: string | null;
  isCompleted: boolean;
}) {
  const totalRows = lineup.rows.length;

  return (
    <>
      {lineup.rows.map((row, rowIndex) =>
        row.map((slot, colIndex) => {
          const player = resolvePitchSlotPlayer(slot);
          if (!player) return null;

          const pos = formationSlotPosition(
            side,
            rowIndex,
            colIndex,
            row.length,
            totalRows,
            lineup.formation,
            true
          );
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
}: {
  player: NonNullable<ReturnType<typeof resolvePitchSlotPlayer>>;
  slot: PitchLineupSlot;
  sport: SportId;
  badges: ReturnType<typeof buildLineupPlayerEvents>;
  showMotm: boolean;
}) {
  const name = playerShortName(player.first_name, player.last_name);

  return (
    <Link
      href={`/players/${player.id}?sport=${sport}`}
      className="group flex w-[68px] flex-col items-center sm:w-[74px]"
    >
      <div className="relative mx-1 mb-0.5 h-12 w-12">
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-white p-[3px] shadow-sm",
            badges.redCard && "blur-[2px] brightness-75"
          )}
        >
          <div className="h-full w-full overflow-hidden rounded-full bg-white">
            <PlayerAvatar
              firstName={player.first_name}
              lastName={player.last_name}
              avatarUrl={player.avatar_url}
              size="md"
            />
          </div>
        </div>
        <LineupPlayerBadges badges={badges} showMotm={showMotm} />
      </div>

      <p className="max-w-[76px] text-center font-display text-[9px] font-bold leading-tight text-white drop-shadow-sm group-hover:underline sm:max-w-[84px] sm:text-[10px]">
        {slot.jersey_number}
        {slot.is_captain ? " (c)" : ""} {name}
      </p>
    </Link>
  );
}

/** Full vertical pitch — 68×105m, sharp rectangle, corner arcs inside touchlines. */
function FullPitchMarkings() {
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

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
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
    </svg>
  );
}
