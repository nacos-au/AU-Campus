import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { MatchDateGroup, MatchweekNav } from "@/components/match/match-row";
import { BrandedSection } from "@/components/layout/branded-section";
import { MatchesFilters } from "@/components/layout/filters-bar";
import { PageContent } from "@/components/layout/page-content";
import { getMatchesBySport, getSportConfig } from "@/lib/data/get-by-sport";
import { parseSportParam } from "@/lib/utils/sport";
import type { Match } from "@/lib/types/database";

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date) || isTomorrow(date) || isYesterday(date)) {
    return format(date, "EEE d MMM");
  }
  return format(date, "EEE d MMM");
}

function groupMatchesByDate(matches: Match[]): Map<string, Match[]> {
  const groups = new Map<string, Match[]>();
  for (const match of matches) {
    const key = formatMatchDate(match.scheduled_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(match);
  }
  return groups;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const activeSport = parseSportParam(sport);
  const config = getSportConfig(activeSport);
  const matches = getMatchesBySport(activeSport);
  const grouped = groupMatchesByDate(matches);

  return (
    <>
      <BrandedSection title={config.matchesTitle} activeSport={activeSport} />
      <PageContent>
        <MatchesFilters sport={activeSport} />

        <MatchweekNav label={config.dateNavLabel} range={config.dateNavRange} />

        <div className="mx-auto max-w-[1200px] bg-wrapper px-4 pb-16 pt-2 sm:px-6">
          {grouped.size === 0 ? (
            <div className="table-card p-10 text-center opacity-70">
              No {config.label.toLowerCase()} fixtures scheduled yet.
            </div>
          ) : (
            Array.from(grouped.entries()).map(([date, dayMatches]) => (
              <div key={date} className="table-card mb-4 overflow-hidden">
                <MatchDateGroup date={date} matches={dayMatches} />
              </div>
            ))
          )}
        </div>
      </PageContent>
    </>
  );
}
