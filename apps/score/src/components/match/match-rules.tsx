import Link from "next/link";
import type { Match } from "@/lib/types/database";
import { competitionPhaseLabel } from "@/lib/match/competition-phase-label";
import { TennisLineupBanner } from "@/components/match/tennis-lineup";
import { dbIdToSport } from "@/lib/utils/sport";

/**
 * Competition name + plain match-day text (no chips/pills on white).
 */
export function MatchRulesBanner({
  match,
  sport,
}: {
  match: Match;
  sport?: string;
}) {
  const tournament = match.tournament;
  const phaseLabel = competitionPhaseLabel(match.competition_phase);
  const sportSlug = sport ?? dbIdToSport(match.sport_id);
  const competitionHref = tournament?.id
    ? `/competition?sport=${sportSlug}&competition=${tournament.id}`
    : `/competition?sport=${sportSlug}`;

  if (!tournament?.name && !phaseLabel) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-2 pt-4 text-center sm:px-6">
      {tournament?.name && (
        <Link
          href={competitionHref}
          className="font-display text-sm font-bold text-accent/70 hover:text-accent hover:underline"
        >
          {tournament.name}
        </Link>
      )}
      {phaseLabel && (
        <p className="mt-1 font-display text-xs font-semibold uppercase tracking-wide text-accent/45">
          {phaseLabel}
        </p>
      )}
    </div>
  );
}

export function PenaltyShootoutScore({ match }: { match: Match }) {
  if (match.home_penalties == null || match.away_penalties == null) return null;
  const awayFirst = match.away_team?.name ?? "Away";
  return (
    <p className="mt-3 font-display text-sm font-bold opacity-70">
      Penalties: {match.home_penalties}–{match.away_penalties}
      <span className="ml-2 text-xs font-semibold">
        (5 each, sudden death · {awayFirst} shot first
        {match.went_to_extra_time ? " · after extra time" : ""})
      </span>
    </p>
  );
}

export function DoublesLineup({ match }: { match: Match }) {
  if (dbIdToSport(match.sport_id) !== "tennis") return null;
  return <TennisLineupBanner match={match} />;
}
