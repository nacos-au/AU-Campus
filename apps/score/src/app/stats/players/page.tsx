import { PlayerStatRow } from "@/components/stats/stat-leader-card";
import { BrandedSection } from "@/components/layout/branded-section";
import { PlayerStatsFilters } from "@/components/layout/filters-bar";
import { PageContent } from "@/components/layout/page-content";
import { tournamentOmitsStats } from "@/lib/competition/stats-availability";
import { getTournamentForSport } from "@/lib/data/demo-competition";
import { getStatLabelsBySport, formatStatValue } from "@/lib/data/get-by-sport";
import { fetchStatLeaders } from "@/lib/data/stat-leaders";
import { fetchTournamentForSport } from "@/lib/data/repository";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { parseSportParam, sportToDbId, SPORT_LABELS } from "@/lib/utils/sport";

export const metadata = { title: "Player Stats" };
export const dynamic = "force-dynamic";

export default async function PlayerStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  const sportDbId = sportToDbId(activeSport);
  const live = hasSupabaseConfig();

  const tournament = live
    ? await fetchTournamentForSport(sportDbId, competition)
    : getTournamentForSport(sportDbId, competition);

  const omitsStats = tournamentOmitsStats(tournament);
  const leaders = omitsStats
    ? { goals: [], assists: [], passes: [], cleanSheets: [] }
    : await fetchStatLeaders({
        sport: activeSport,
        tournamentId: tournament?.id,
        limit: 50,
      });
  const [primaryStat] = getStatLabelsBySport(activeSport);
  const playerStats = leaders.goals.map((entry, i) => ({ rank: i + 1, ...entry }));

  return (
    <>
      <BrandedSection
        title={`${SPORT_LABELS[activeSport]} Player Stats`}
        activeSport={activeSport}
      />
      <PageContent>
        <PlayerStatsFilters sport={activeSport} />
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          {omitsStats ? (
            <div className="rounded-xl border border-rule bg-white px-6 py-12 text-center">
              <p className="font-display text-lg font-extrabold">Stats not available</p>
              <p className="mt-2 text-sm text-accent/70">
                Player stats are not tracked for this competition
                {tournament ? ` (${tournament.name})` : ""}.
              </p>
            </div>
          ) : (
            <div className="table-card overflow-hidden">
              <div className="mb-0 grid grid-cols-[2.5rem_1fr_auto] border-b border-rule bg-white px-5 py-4 font-display text-xs font-extrabold uppercase sm:grid-cols-[3rem_1fr_auto]">
                <span>Rank</span>
                <span>Player</span>
                <span className="text-right">{primaryStat}</span>
              </div>
              {playerStats.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-accent/60">
                  No stats logged yet for{" "}
                  {tournament ? tournament.name : SPORT_LABELS[activeSport]}.
                </p>
              ) : (
                playerStats.map((entry) => (
                  <PlayerStatRow
                    key={entry.player.id}
                    rank={entry.rank}
                    player={entry.player}
                    teamName={entry.teamName}
                    teamCode={entry.teamCode}
                    value={entry.value}
                    statLabel={primaryStat}
                    sport={activeSport}
                    formatValue={(v) => formatStatValue(activeSport, 0, v)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
}
