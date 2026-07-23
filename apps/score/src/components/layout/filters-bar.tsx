import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
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

export function FilterToggleButton() {
  return (
    <button
      type="button"
      aria-label="Open filters"
      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-[#d0d0d0] bg-white text-accent"
    >
      <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
  );
}

export function FilterSelect({
  label,
  wide,
  className,
}: {
  label: string;
  wide?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[42px] shrink-0 items-center justify-between gap-4 rounded-lg border border-[#d0d0d0] bg-white px-4 font-display text-sm font-semibold text-accent",
        wide && "min-w-[180px] flex-1 sm:max-w-[280px]",
        className
      )}
    >
      <span className="truncate">{label}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
    </button>
  );
}

export function FilterReset() {
  return (
    <button
      type="button"
      className="ml-auto flex h-[42px] shrink-0 items-center gap-2 rounded-lg border border-[#d0d0d0] bg-white px-4"
    >
      <span className="filters-bar-reset-label font-display text-sm font-medium">Reset</span>
      <RotateCcw className="h-4 w-4 text-accent" strokeWidth={2.5} />
    </button>
  );
}

/** Matches page — sport-aware filter row */
export function MatchesFilters({ sport = "football" }: { sport?: SportId }) {
  const config = getSportConfig(sport);
  return (
    <FiltersBar>
      <FilterToggleButton />
      <FilterSelect label={config.tournament} wide />
      <FilterSelect label={config.season} />
      <FilterSelect label={config.roundFilter} />
      <FilterSelect label={config.homeAwayFilter} />
      <FilterReset />
    </FiltersBar>
  );
}

/** Table page filters */
export function TableFilters({ sport = "football" }: { sport?: SportId }) {
  const config = getSportConfig(sport);
  return (
    <FiltersBar>
      <FilterToggleButton />
      <FilterSelect label={config.tournament} wide />
      <FilterSelect label={config.season} />
      <FilterReset />
    </FiltersBar>
  );
}

/** Player stats filters */
export function PlayerStatsFilters({ sport = "football" }: { sport?: SportId }) {
  const config = getSportConfig(sport);
  const [primaryStat] = getStatLabelsBySport(sport);
  return (
    <FiltersBar>
      <FilterToggleButton />
      <FilterSelect label={primaryStat} />
      <FilterSelect label={config.season} />
      <FilterSelect label={`All ${config.clubsLabel}`} />
      <FilterSelect label="Positions" />
      <FilterReset />
    </FiltersBar>
  );
}
