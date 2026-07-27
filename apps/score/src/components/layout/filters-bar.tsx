import type { SportId } from "@/lib/utils/sport";
import { getStatLabelsBySport } from "@/lib/data/get-by-sport";
import { getSportConfig } from "@/lib/utils/sport-config";
import { cn } from "@/lib/utils/cn";

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

/** Matches page — sport-aware context row (demo season labels) */
export function MatchesFilters({ sport = "football" }: { sport?: SportId }) {
  const config = getSportConfig(sport);
  return (
    <FiltersBar>
      <FilterChip label={config.tournament} className="min-w-[180px] flex-1 sm:max-w-[280px]" />
      <FilterChip label={config.season} />
      <FilterChip label={config.roundFilter} />
      <FilterChip label={config.homeAwayFilter} />
    </FiltersBar>
  );
}

/** Table page filters */
export function TableFilters({ sport = "football" }: { sport?: SportId }) {
  const config = getSportConfig(sport);
  return (
    <FiltersBar>
      <FilterChip label={config.tournament} className="min-w-[180px] flex-1 sm:max-w-[280px]" />
      <FilterChip label={config.season} />
    </FiltersBar>
  );
}

/** Player stats filters */
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
