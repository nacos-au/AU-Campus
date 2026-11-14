import Link from "next/link";
import { StatLeaderCard } from "@/components/stats/stat-leader-card";
import { StatsAwardsSection } from "@/components/stats/stats-awards-section";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { SectionTitle } from "@/components/layout/section-title";
import { StatsFilters } from "@/components/layout/filters-bar";
import { getAwardsForSport } from "@/lib/data/demo-awards";
import { getTournamentForSport } from "@/lib/data/demo-competition";
import { getStatCardsBySport, formatStatValue } from "@/lib/data/get-by-sport";
import { getScoreDemoMode } from "@/lib/data/mode";
import { fetchTournamentForSport } from "@/lib/data/repository";
import { parseSportParam, sportToDbId, SPORT_LABELS } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Stats Centre" };
export const dynamic = "force-dynamic";

const statsTabs = [
  { href: "/stats", label: "Dashboard" },
  { href: "/stats/players", label: "Player" },
  { href: "/teams", label: "Club" },
  { href: "/stats/players", label: "All-time Stats" },
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string; view?: string }>;
}) {
  const { sport, competition, view } = await searchParams;
  const activeSport = parseSportParam(sport);
  const sportDbId = sportToDbId(activeSport);
  const mode = activeSport === "basketball" && view === "advanced" ? "advanced" : "default";
  const statCards = getStatCardsBySport(activeSport, mode);
  const demo = await getScoreDemoMode();
  const tournament = demo
    ? getTournamentForSport(sportDbId, competition)
    : await fetchTournamentForSport(sportDbId, competition);
  const awards = demo
    ? getAwardsForSport(sportDbId, undefined, tournament?.id)
    : [];

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
          {activeSport === "basketball" && (
            <p className="mt-2 text-sm opacity-70">
              {mode === "advanced" ? (
                <>
                  Season totals.{" "}
                  <Link href={`/stats?sport=basketball`} className="font-bold text-accent underline">
                    Back to per-game
                  </Link>
                </>
              ) : (
                <>
                  Per-game rates (PPG, RPG, 3PG, FG%, APG).{" "}
                  <Link
                    href={`/stats?sport=basketball&view=advanced`}
                    className="font-bold text-accent underline"
                  >
                    Advanced totals
                  </Link>
                </>
              )}
            </p>
          )}
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
