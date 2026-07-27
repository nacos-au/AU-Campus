import Link from "next/link";
import { StatLeaderCard } from "@/components/stats/stat-leader-card";
import { StatsAwardsSection } from "@/components/stats/stats-awards-section";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { SectionTitle } from "@/components/layout/site-header";
import { StatsFilters } from "@/components/layout/filters-bar";
import { getAwardsForSport } from "@/lib/data/demo-awards";
import { getTournamentForSport } from "@/lib/data/demo-competition";
import { getStatCardsBySport, formatStatValue } from "@/lib/data/get-by-sport";
import { parseSportParam, sportToDbId, SPORT_LABELS } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Stats Centre" };

const statsTabs = [
  { href: "/stats", label: "Dashboard" },
  { href: "/stats/players", label: "Player" },
  { href: "/teams", label: "Club" },
  { href: "/stats/players", label: "All-time Stats" },
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  const sportDbId = sportToDbId(activeSport);
  const statCards = getStatCardsBySport(activeSport);
  const tournament = getTournamentForSport(sportDbId, competition);
  const awards = getAwardsForSport(sportDbId, undefined, tournament?.id);

  return (
    <>
      <BrandedSection title="Stats Centre" activeSport={activeSport} />
      <PageContent>
        <StatsFilters sport={activeSport} competitionId={tournament?.id} />
        <nav className="border-b border-rule bg-wrapper">
          <div className="mx-auto flex max-w-[1200px] gap-6 overflow-x-auto px-4 sm:px-6">
            {statsTabs.map(({ href, label }) => (
              <Link
                key={label}
                href={`${href}?sport=${activeSport}`}
                className={cn(
                  "shrink-0 py-3 font-display text-sm font-semibold",
                  label === "Dashboard" && "border-b-2 border-accent"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <SectionTitle>
            {tournament ? `${tournament.name} ${tournament.season}` : `${SPORT_LABELS[activeSport]} 2025/26`} Player Stats
          </SectionTitle>
          <div className="scroll-snap-x -mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.title} className="w-[260px] shrink-0 sm:w-auto">
                <StatLeaderCard
                  title={card.title}
                  leaders={card.leaders}
                  sport={activeSport}
                  href={`/stats/players?sport=${activeSport}`}
                  formatValue={(v) => formatStatValue(activeSport, card.statIndex, v)}
                />
              </div>
            ))}
          </div>
          <StatsAwardsSection
            sport={activeSport}
            sportDbId={sportDbId}
            initialAwards={awards}
            competitionId={tournament?.id}
            competitionType={tournament?.competition_type ?? "league"}
          />
        </div>
      </PageContent>
    </>
  );
}
