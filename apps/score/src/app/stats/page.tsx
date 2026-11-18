import Link from "next/link";
import { StatLeaderCard } from "@/components/stats/stat-leader-card";
import { StatsAwardsSection } from "@/components/stats/stats-awards-section";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { SectionTitle } from "@/components/layout/section-title";
import { StatsFilters } from "@/components/layout/filters-bar";
import { tournamentOmitsStats } from "@/lib/competition/stats-availability";
import { getAwardsForSport } from "@/lib/data/demo-awards";
import { getTournamentForSport } from "@/lib/data/demo-competition";
import { formatStatValue } from "@/lib/data/get-by-sport";
import { fetchStatCards } from "@/lib/data/stat-leaders";
import { fetchSeasonAwards, fetchTournamentForSport } from "@/lib/data/repository";
import { hasSupabaseConfig } from "@/lib/demo-mode";
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
  const live = hasSupabaseConfig();

  const tournament = live
    ? await fetchTournamentForSport(sportDbId, competition)
    : getTournamentForSport(sportDbId, competition);

  const omitsStats = tournamentOmitsStats(tournament);

  const statCards = omitsStats
    ? []
    : await fetchStatCards({
        sport: activeSport,
        tournamentId: tournament?.id,
        mode,
      });

  const awards = omitsStats
    ? []
    : live
      ? await fetchSeasonAwards(sportDbId, tournament?.season ?? "2026/27", {
          tournamentId: tournament?.id,
        })
      : getAwardsForSport(sportDbId, undefined, tournament?.id);

  const playersHref = tournament?.id
    ? `/stats/players?sport=${activeSport}&competition=${tournament.id}`
    : `/stats/players?sport=${activeSport}`;

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
                href={
                  label === "Player" || label === "All-time Stats"
                    ? playersHref
                    : `${href}?sport=${activeSport}${
                        tournament?.id ? `&competition=${tournament.id}` : ""
                      }`
                }
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
            {tournament
              ? `${tournament.name} ${tournament.season}`
              : `${SPORT_LABELS[activeSport]} 2026/27`}{" "}
            Player Stats
          </SectionTitle>

          {omitsStats ? (
            <div className="mt-8 rounded-xl border border-rule bg-white px-6 py-12 text-center">
              <p className="font-display text-lg font-extrabold">Stats not available</p>
              <p className="mt-2 text-sm text-accent/70">
                Player stats are not tracked for this competition
                {tournament ? ` (${tournament.name})` : ""}. Results and fixtures still appear on
                Matches.
              </p>
            </div>
          ) : (
            <>
              {activeSport === "basketball" && (
                <p className="mt-2 text-sm opacity-70">
                  {mode === "advanced" ? (
                    <>
                      Season totals.{" "}
                      <Link
                        href={`/stats?sport=basketball`}
                        className="font-bold text-accent underline"
                      >
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
                      href={playersHref}
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
                demoMode={!live}
              />
            </>
          )}
        </div>
      </PageContent>
    </>
  );
}
