import type { SportId } from "@/lib/utils/sport";
import { sportToDbId } from "@/lib/utils/sport";
import { getTournamentsForSport } from "@/lib/data/demo-competition";
import { getStatLabelsBySport } from "@/lib/data/get-by-sport";
import { getSportConfig } from "@/lib/utils/sport-config";
import { cn } from "@/lib/utils/cn";
import { toCompetitionOptions } from "@/lib/competition/competition-filter-utils";
import { CompetitionFilters } from "@/components/layout/competition-filters";
import { getScoreDemoMode } from "@/lib/data/mode";
import { fetchTournamentsForSport } from "@/lib/data/repository";

export function FiltersBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="filters-bar border-b border-rule bg-wrapper">
      <div className="mx-auto flex max-w-[1200px] items-stretch gap-2 overflow-x-auto px-4 py-3 sm:flex-wrap sm:px-6">
        {children}
      </div>
    </div>
  );
}

function FilterChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-[42px] shrink-0 items-center rounded-lg border border-[#d0d0d0] bg-white px-4 font-display text-sm font-semibold text-accent",
        className
      )}
    >
      {label}
    </span>
  );
}

async function loadCompetitionOptions(sport: SportId) {
  const sportDbId = sportToDbId(sport);
  const demo = await getScoreDemoMode();
  const tournaments = demo
    ? getTournamentsForSport(sportDbId)
    : await fetchTournamentsForSport(sportDbId);
  return toCompetitionOptions(tournaments);
}

/** Matches page — competition + season + matchweek + status */
export async function MatchesFilters({
  sport = "football",
  competitionId,
  matchweeks = [],
  activeMw = "all",
  activeStatus = "all",
}: {
  sport?: SportId;
  competitionId?: string;
  matchweeks?: number[];
  activeMw?: number | "all";
  activeStatus?: "all" | "live" | "upcoming" | "finished";
}) {
  const competitions = await loadCompetitionOptions(sport);
  return (
    <CompetitionFilters
      sport={sport}
      basePath="/"
      competitions={competitions}
      activeCompetitionId={competitionId}
      variant="matches"
      matchweeks={matchweeks}
      activeMw={activeMw}
      activeStatus={activeStatus}
    />
  );
}

/** Table page — competition + season */
export async function TableFilters({
  sport = "football",
  competitionId,
}: {
  sport?: SportId;
  competitionId?: string;
}) {
  const competitions = await loadCompetitionOptions(sport);
  return (
    <CompetitionFilters
      sport={sport}
      basePath="/standings"
      competitions={competitions}
      activeCompetitionId={competitionId}
      variant="table"
    />
  );
}

/** Stats dashboard — competition + season */
export async function StatsFilters({
  sport = "football",
  competitionId,
}: {
  sport?: SportId;
  competitionId?: string;
}) {
  const competitions = await loadCompetitionOptions(sport);
  return (
    <CompetitionFilters
      sport={sport}
      basePath="/stats"
      competitions={competitions}
      activeCompetitionId={competitionId}
      variant="stats"
    />
  );
}

/** Clubs page — competition + season */
export async function ClubsFilters({
  sport = "football",
  competitionId,
}: {
  sport?: SportId;
  competitionId?: string;
}) {
  const competitions = await loadCompetitionOptions(sport);
  return (
    <CompetitionFilters
      sport={sport}
      basePath="/teams"
      competitions={competitions}
      activeCompetitionId={competitionId}
      variant="clubs"
    />
  );
}

/** Competition page — competition + season */
export async function CompetitionPageFilters({
  sport = "football",
  competitionId,
}: {
  sport?: SportId;
  competitionId?: string;
}) {
  const competitions = await loadCompetitionOptions(sport);
  return (
    <CompetitionFilters
      sport={sport}
      basePath="/competition"
      competitions={competitions}
      activeCompetitionId={competitionId}
      variant="competition"
    />
  );
}

/** Player stats filters — stat-focused row (no competition picker here) */
export function PlayerStatsFilters({ sport = "football" }: { sport?: SportId }) {
  const config = getSportConfig(sport);
  const [primaryStat] = getStatLabelsBySport(sport);
  return (
    <FiltersBar>
      <FilterChip label={primaryStat} />
      <FilterChip label={config.season} />
      <FilterChip label={`All ${config.clubsLabel}`} />
      <FilterChip label="Positions" />
    </FiltersBar>
  );
}
