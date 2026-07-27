import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { Match } from "@/lib/types/database";
import { TeamCrest } from "@/components/ui/team-crest";
import { LiveBadge } from "@/components/layout/site-header";
import { getTrackResultsForMatch } from "@/lib/data/demo-match-details";
import { scoreClass } from "@/lib/match/score-highlight";
import { dbIdToSport, type SportId } from "@/lib/utils/sport";
import { getSportConfig } from "@/lib/utils/sport-config";
import { cn } from "@/lib/utils/cn";

export function MatchRow({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const home = match.home_team;
  const away = match.away_team;
  const sport = dbIdToSport(match.sport_id);
  const config = getSportConfig(sport);

  if (config.isEventSport) {
    const results = getTrackResultsForMatch(match.id);
    const leader = results[0];
    return (
      <Link
        href={`/matches/${match.id}?sport=${sport}`}
        className="flex items-center justify-between border-b border-rule bg-white px-4 py-5 hover:bg-wrapper sm:px-5"
      >
        <div className="flex items-center gap-3">
          <TeamCrest code={home?.department?.short_code ?? "AU"} logoUrl={home?.logo_url} sport={sport} alt={home?.name} />
          <span className="font-display text-base font-bold">{home?.name ?? "Track Event"}</span>
        </div>
        <div className="text-right">
          {isLive && leader ? (
            <p className="font-display text-sm font-bold tabular-nums">
              {leader.time_display}s <span className="text-xs font-semibold opacity-60">LIVE</span>
            </p>
          ) : isLive ? (
            <LiveBadge />
          ) : (
            <p className="font-display text-sm font-bold">
              {format(new Date(match.scheduled_at), "HH:mm")}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Kickoff time + status on the left, stacked teams, scores at the right.
  // Unplayed matches simply show "–" — no score box needed.
  return (
    <Link
      href={`/matches/${match.id}?sport=${sport}`}
      className="flex items-center gap-3 border-b border-rule bg-white px-4 py-3 hover:bg-wrapper sm:px-5"
    >
      <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-rule pr-3 text-center">
        <span className="font-display text-xs font-bold tabular-nums opacity-70">
          {format(new Date(match.scheduled_at), "HH:mm")}
        </span>
        {isLive ? (
          <LiveBadge />
        ) : (
          <span className={cn("text-xs font-semibold", isCompleted ? "opacity-60" : "opacity-30")}>
            {isCompleted ? "FT" : "–"}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <TeamLine team={home} sport={sport} highlight={isCompleted && (match.home_score ?? 0) > (match.away_score ?? 0)} />
        <TeamLine team={away} sport={sport} highlight={isCompleted && (match.away_score ?? 0) > (match.home_score ?? 0)} />
      </div>

      {(isLive || isCompleted) && (
        <div
          className={cn(
            "flex shrink-0 flex-col items-end gap-1.5 font-display text-sm font-bold tabular-nums",
            isLive && "text-accent"
          )}
        >
          <span className={scoreClass(match.home_score, match.away_score, "home", "sm")}>
            {match.home_score}
          </span>
          <span className={scoreClass(match.home_score, match.away_score, "away", "sm")}>
            {match.away_score}
          </span>
        </div>
      )}
    </Link>
  );
}

function TeamLine({ team, highlight, sport }: { team?: Match["home_team"]; highlight?: boolean; sport: SportId }) {
  return (
    <div className="flex items-center gap-2">
      <TeamCrest
        code={team?.department?.short_code ?? "—"}
        logoUrl={team?.logo_url}
        sport={sport}
        alt={team?.name}
        size="xs"
      />
      <span
        className={cn(
          "truncate font-display text-sm",
          highlight ? "font-extrabold" : "font-semibold"
        )}
      >
        {team?.name ?? "TBD"}
      </span>
    </div>
  );
}


export function MatchDateGroup({ date, matches }: { date: string; matches: Match[] }) {
  const liveMatch = matches.find((m) => m.status === "live");

  return (
    <section>
      <div className="flex items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="font-display text-sm font-extrabold sm:text-base">{date}</h3>
        {liveMatch && (
          <Link
            href={`/matches/${liveMatch.id}?sport=${dbIdToSport(liveMatch.sport_id)}`}
            className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 font-display text-xs font-bold sm:px-4 sm:text-sm"
          >
            Live blog
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div>
        {matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}

export function MatchweekNav({
  label,
  range,
}: {
  label: string;
  range: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 border-b border-rule bg-wrapper px-4 py-4 sm:gap-4 sm:py-5">
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule bg-white hover:bg-wrapper"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 text-center">
        <p className="font-display text-sm font-extrabold">{label}</p>
        <p className="truncate text-xs opacity-60">{range}</p>
      </div>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule bg-white hover:bg-wrapper"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
