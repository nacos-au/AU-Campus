import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { Match } from "@/lib/types/database";
import { TeamCrest } from "@/components/ui/team-crest";
import { LiveBadge } from "@/components/layout/site-header";
import { dbIdToSport } from "@/lib/utils/sport";
import { getSportConfig, scoreUnitLabel } from "@/lib/utils/sport-config";

export function MatchRow({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const home = match.home_team;
  const away = match.away_team;
  const sport = dbIdToSport(match.sport_id);
  const config = getSportConfig(sport);

  if (config.isEventSport) {
    return (
      <Link
        href={`/matches/${match.id}?sport=${sport}`}
        className="flex items-center justify-between border-b border-rule bg-white px-4 py-5 hover:bg-wrapper sm:px-5"
      >
        <div className="flex items-center gap-3">
          <TeamCrest code={home?.department?.short_code ?? "AU"} logoUrl={home?.logo_url} alt={home?.name} />
          <span className="font-display text-base font-bold">{home?.name ?? "Track Event"}</span>
        </div>
        <div className="text-right">
          {isLive ? <LiveBadge /> : (
            <p className="font-display text-sm font-bold">
              {format(new Date(match.scheduled_at), "HH:mm")}
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/matches/${match.id}?sport=${sport}`}
      className="block border-b border-rule bg-white py-4 hover:bg-wrapper sm:px-5 sm:py-5"
    >
      <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-6 px-4 sm:grid sm:px-0">
        <div className="flex items-center justify-end gap-3">
          <span className="text-right font-display text-base font-bold">{home?.name}</span>
          <TeamCrest code={home?.department?.short_code ?? "—"} logoUrl={home?.logo_url} alt={home?.name} />
        </div>
        <ScoreCenter match={match} isLive={isLive} isCompleted={isCompleted} sport={sport} />
        <div className="flex items-center gap-3">
          <TeamCrest code={away?.department?.short_code ?? "—"} logoUrl={away?.logo_url} alt={away?.name} />
          <span className="font-display text-base font-bold">{away?.name}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 sm:hidden">
        <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
          <TeamCrest code={home?.department?.short_code ?? "—"} logoUrl={home?.logo_url} alt={home?.name} size="sm" />
          <span className="truncate text-right font-display text-sm font-bold">{home?.name}</span>
        </div>
        <div className="shrink-0 px-2">
          <ScoreCenter match={match} isLive={isLive} isCompleted={isCompleted} sport={sport} compact />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <TeamCrest code={away?.department?.short_code ?? "—"} logoUrl={away?.logo_url} alt={away?.name} size="sm" />
          <span className="truncate font-display text-sm font-bold">{away?.name}</span>
        </div>
      </div>
    </Link>
  );
}

function ScoreCenter({
  match,
  isLive,
  isCompleted,
  sport,
  compact,
}: {
  match: Match;
  isLive: boolean;
  isCompleted: boolean;
  sport: ReturnType<typeof dbIdToSport>;
  compact?: boolean;
}) {
  const config = getSportConfig(sport);
  const unit = scoreUnitLabel(config.scoreUnit);

  return (
    <div className={compact ? "min-w-[56px] text-center" : "min-w-[80px] text-center"}>
      {isLive || isCompleted ? (
        <div>
          <p className={`font-display font-extrabold tabular-nums ${compact ? "text-sm" : "text-lg"}`}>
            {match.home_score} - {match.away_score}
          </p>
          {unit && (
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-50">{unit}</p>
          )}
          {isLive && <LiveBadge />}
        </div>
      ) : (
        <p className={`font-display font-bold ${compact ? "text-sm" : "text-base"}`}>
          {format(new Date(match.scheduled_at), "HH:mm")}
        </p>
      )}
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
