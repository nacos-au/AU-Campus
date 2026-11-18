"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, RotateCcw } from "lucide-react";
import type { CompetitionOption } from "@/lib/competition/competition-filter-utils";
import type { CalendarWeek } from "@/lib/match/matchweek";
import { getSportConfig } from "@/lib/utils/sport-config";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

type FilterVariant = "matches" | "table" | "stats" | "clubs" | "competition";

function FilterSelect({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="h-[42px] w-full cursor-pointer appearance-none rounded-lg border border-[#d0d0d0] bg-white pl-4 pr-9 font-display text-sm font-semibold text-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
    </div>
  );
}

/**
 * Horizontal filter row: competition, season, matchweek, status.
 */
export function CompetitionFilters({
  sport,
  basePath,
  competitions,
  activeCompetitionId,
  variant = "matches",
  calendarWeeks = [],
  activeMw = "all",
  activeStatus = "all",
}: {
  sport: SportId;
  basePath: string;
  competitions: CompetitionOption[];
  activeCompetitionId?: string;
  variant?: FilterVariant;
  calendarWeeks?: CalendarWeek[];
  activeMw?: string | "all";
  activeStatus?: "all" | "live" | "upcoming" | "finished";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = getSportConfig(sport);

  const activeId = activeCompetitionId ?? competitions[0]?.id ?? "";
  const active = competitions.find((c) => c.id === activeId) ?? competitions[0];

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sport", sport);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function reset() {
    const first = competitions[0];
    if (!first) {
      router.push(`${basePath}?sport=${sport}`);
      return;
    }
    router.push(`${basePath}?sport=${sport}&competition=${first.id}`);
  }

  const seasonOptions = [
    { value: active?.season ?? config.season, label: active?.season ?? config.season },
  ];

  const matchweekOptions = [
    { value: "all", label: "All weeks" },
    ...calendarWeeks.map((w) => ({
      value: w.key,
      label: `Matchweek · ${w.label}`,
    })),
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "live", label: "Live" },
    { value: "upcoming", label: "Upcoming" },
    { value: "finished", label: "Finished" },
  ] as const;

  return (
    <div className="filters-bar border-b border-rule bg-wrapper">
      <div className="mx-auto flex max-w-[1200px] items-center gap-2 overflow-x-auto px-4 py-3 sm:flex-wrap sm:px-6">
        {competitions.length > 0 && (
          <FilterSelect
            aria-label="Competition"
            value={activeId}
            onChange={(id) => navigate({ competition: id, mw: null })}
            options={competitions.map((c) => ({ value: c.id, label: c.name }))}
            className="min-w-[180px] flex-1 sm:max-w-[280px]"
          />
        )}

        <FilterSelect
          aria-label="Season"
          value={seasonOptions[0].value}
          onChange={() => {}}
          options={seasonOptions}
        />

        {variant === "matches" && (
          <>
            <FilterSelect
              aria-label="Matchweek"
              value={activeMw === "all" ? "all" : String(activeMw)}
              onChange={(v) => navigate({ mw: v === "all" ? "all" : v })}
              options={matchweekOptions}
            />
            <div className="flex h-[42px] shrink-0 items-center gap-1 rounded-lg border border-[#d0d0d0] bg-white p-1">
              {statusOptions.map((o) => {
                const on = activeStatus === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => navigate({ status: o.value === "all" ? null : o.value })}
                    className={cn(
                      /* btn-filled / status-pill beat .page-content button { color: accent } */
                      "status-pill rounded-md px-2.5 py-1.5 font-display text-xs font-bold transition",
                      on ? "btn-filled" : "hover:bg-accent"
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={reset}
          className="ml-auto flex h-[42px] shrink-0 items-center gap-2 rounded-lg border border-[#d0d0d0] bg-white px-4 font-display text-sm font-semibold text-accent/60 hover:text-accent"
        >
          Reset
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
