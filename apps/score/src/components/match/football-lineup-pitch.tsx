import Link from "next/link";
import { Star } from "lucide-react";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { GoalBallIcon, SubstitutionIcon } from "@/components/match/match-event-icons";
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
    <div className="table-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3 sm:px-5">
        <TeamHeader team={match.home_team} formation={homeLineup?.formation} align="left" />
        <span className="font-display text-xs font-bold uppercase tracking-wide text-accent/40">vs</span>
        <TeamHeader team={match.away_team} formation={awayLineup?.formation} align="right" />
      </div>

      <div className="relative aspect-[16/10] min-h-[320px] w-full overflow-hidden bg-[#2d6a4f] sm:min-h-[380px]">
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
    </div>
  );
}

function TeamHeader({
  team,
  formation,
  align,
}: {
  team: Match["home_team"];
  formation?: string;
  align: "left" | "right";
}) {
  const code = team?.department?.short_code ?? "AU";
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <TeamCrest code={code} logoUrl={team?.logo_url} alt={team?.name ?? "Team"} size="sm" />
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-extrabold text-accent">{team?.name ?? "Team"}</p>
        {formation && <p className="text-xs text-accent/50">{formation}</p>}
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
  const seen = new Set<string>();

  return (
    <>
      {lineup.rows.map((row, rowIndex) =>
        row.map((slot, colIndex) => {
          const key = `${side}-${rowIndex}-${colIndex}-${slot.player_id}`;
          if (seen.has(slot.player_id)) return null;
          seen.add(slot.player_id);

          const player = resolvePitchSlotPlayer(slot);
          if (!player) return null;

          const pos = formationSlotPosition(side, rowIndex, colIndex, row.length, totalRows);
          const badges = buildLineupPlayerEvents(events, player.id, motmPlayerId, matchStarted);

          return (
            <div
              key={key}
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
  const captainSuffix = slot.is_captain ? " (c)" : "";

  return (
    <Link
      href={`/players/${player.id}?sport=${sport}`}
      className="group flex w-[52px] flex-col items-center sm:w-[60px]"
    >
      <div className="relative">
        <div className="rounded-full ring-2 ring-white/90">
          <PlayerAvatar
            firstName={player.first_name}
            lastName={player.last_name}
            avatarUrl={player.avatar_url}
            size="md"
          />
        </div>

        {(badges.substitutedOn || badges.substitutedOff) && (
          <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow">
            <SubstitutionIcon className="h-3 w-3" />
          </span>
        )}

        {badges.goals > 0 && (
          <span className="absolute -right-1 top-0 flex items-center gap-px">
            {Array.from({ length: Math.min(badges.goals, 2) }).map((_, i) => (
              <GoalBallIcon key={i} className="h-3.5 w-3.5 text-accent" />
            ))}
          </span>
        )}

        {badges.assists > 0 && (
          <span className="absolute -right-1 top-4">
            <AssistIcon />
          </span>
        )}

        {showMotm && badges.isMotm && (
          <span className="absolute -bottom-0.5 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2563eb] text-white shadow">
            <Star className="h-2.5 w-2.5 fill-current" />
          </span>
        )}
      </div>

      <p className="mt-1 line-clamp-2 text-center font-display text-[10px] font-bold leading-tight text-white drop-shadow-sm group-hover:underline sm:text-[11px]">
        <span className="tabular-nums">{slot.jersey_number}</span> {name}
        {captainSuffix}
      </p>
    </Link>
  );
}

function AssistIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white drop-shadow" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="#16a34a" />
      <path
        d="M5 10c2-3 4-3 6-5M9 5l2 1-1 2"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function FullPitchMarkings() {
  const line = "border-white/35";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className={cn("absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-white/35")} />
      <div className={cn("absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border", line)} />
      <div className={cn("absolute inset-y-[18%] left-3 w-[14%] border-y border-r", line)} />
      <div className={cn("absolute inset-y-[18%] right-3 w-[14%] border-y border-l", line)} />
      <div className={cn("absolute inset-y-[32%] left-3 w-[6%] border-y border-r", line)} />
      <div className={cn("absolute inset-y-[32%] right-3 w-[6%] border-y border-l", line)} />
    </div>
  );
}
