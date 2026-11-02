import type { Match } from "@/lib/types/database";
import { formatFootballRules } from "@/lib/data/demo-competition";
import { TennisLineupBanner } from "@/components/match/tennis-lineup";
import { dbIdToSport } from "@/lib/utils/sport";

export function MatchRulesBanner({ match }: { match: Match }) {
  const tournament = match.tournament;
  const rules = formatFootballRules(tournament?.rules ?? {});
  const variant = match.match_variant;
  const phase = match.competition_phase;
  const chips = [
    ...rules,
    match.allows_extra_time ? "Extra time if drawn" : null,
    match.allows_penalty_shootout ? "Pens if still level" : null,
  ].filter((x, i, arr): x is string => Boolean(x) && arr.indexOf(x) === i);

  if (!phase && !variant && chips.length === 0) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-2">
        {phase && (
          <span className="rounded-full border border-rule bg-white px-3 py-1 font-display text-xs font-bold uppercase">
            {phase.replace(/_/g, " ")}
          </span>
        )}
        {variant && variant !== "standard" && (
          <span className="rounded-full border border-accent bg-accent/5 px-3 py-1 font-display text-xs font-bold uppercase text-accent">
            {variant}
          </span>
        )}
        {chips.map((rule) => (
          <span key={rule} className="rounded-full border border-rule bg-surface px-3 py-1 text-xs font-semibold opacity-70">
            {rule}
          </span>
        ))}
      </div>
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
