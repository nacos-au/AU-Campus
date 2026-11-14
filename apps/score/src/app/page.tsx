import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { MatchDateGroup, MatchweekNav } from "@/components/match/match-row";
import { BrandedSection } from "@/components/layout/branded-section";
import { MatchesFilters } from "@/components/layout/filters-bar";
import { PageContent } from "@/components/layout/page-content";
import { getTournamentForSport } from "@/lib/data/demo-competition";
import { getMatchesBySport, getSportConfig } from "@/lib/data/get-by-sport";
import { fetchPublicMatches, fetchTournamentForSport } from "@/lib/data/repository";
import { getScoreDemoMode } from "@/lib/data/mode";
import { parseSportParam, sportToDbId } from "@/lib/utils/sport";
import type { Match } from "@/lib/types/database";
import Link from "next/link";

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

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  const config = getSportConfig(activeSport);
  const sportDbId = sportToDbId(activeSport);
  const demo = await getScoreDemoMode();
  const tournament = demo
    ? getTournamentForSport(sportDbId, competition)
    : await fetchTournamentForSport(sportDbId, competition);

  const matches = demo
    ? getMatchesBySport(activeSport, tournament?.id)
    : (
        await fetchPublicMatches({
          sportDbId,
          status: ["live", "paused", "scheduled", "completed"],
          limit: 80,
        })
      )
        .filter((m) => !tournament?.id || m.tournament_id === tournament.id)
        .sort((a, b) => {
          const rank = (s: string) => (s === "live" || s === "paused" ? 0 : s === "scheduled" ? 1 : 2);
          const d = rank(a.status) - rank(b.status);
          if (d !== 0) return d;
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
        });

  const liveCount = matches.filter((m) => m.status === "live" || m.status === "paused").length;
  const grouped = groupMatchesByDate(matches);

  return (
    <>
      <BrandedSection title={config.matchesTitle} activeSport={activeSport} />
      <PageContent>
        <MatchesFilters sport={activeSport} competitionId={tournament?.id} />

        <MatchweekNav label={config.dateNavLabel} range={config.dateNavRange} />

        <div className="mx-auto max-w-[1200px] bg-wrapper px-4 pb-16 pt-2 sm:px-6">
          {liveCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/20 bg-white px-4 py-3">
              <p className="font-display text-sm font-bold">
                {liveCount} live fixture{liveCount === 1 ? "" : "s"} right now
              </p>
              <Link
                href={`/live?sport=${activeSport}`}
                className="text-sm font-bold text-accent hover:underline"
              >
                Open Live
              </Link>
            </div>
          )}

          {grouped.size === 0 ? (
            <div className="table-card p-10 text-center opacity-70">
              {demo
                ? `No ${config.label.toLowerCase()} fixtures scheduled yet.`
                : "No fixtures yet. Publish a competition or open Live once a keeper starts a match."}
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
