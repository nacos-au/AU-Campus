import { PlayerStatRow } from "@/components/stats/stat-leader-card";
import { BrandedSection } from "@/components/layout/branded-section";
import { PlayerStatsFilters } from "@/components/layout/filters-bar";
import { PageContent } from "@/components/layout/page-content";
import { getStatLabelsBySport, getStatLeadersBySport, formatStatValue } from "@/lib/data/get-by-sport";
import { parseSportParam, SPORT_LABELS } from "@/lib/utils/sport";

export const metadata = { title: "Player Stats" };

export default async function PlayerStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const activeSport = parseSportParam(sport);
  const leaders = getStatLeadersBySport(activeSport);
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
          <div className="table-card overflow-hidden">
            <div className="mb-0 grid grid-cols-[2.5rem_1fr_auto] border-b border-rule bg-white px-5 py-4 font-display text-xs font-extrabold uppercase sm:grid-cols-[3rem_1fr_auto]">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">{primaryStat}</span>
            </div>
            {playerStats.map((entry) => (
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
            ))}
          </div>
        </div>
      </PageContent>
    </>
  );
}
