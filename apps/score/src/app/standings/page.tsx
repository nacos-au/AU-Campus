import Link from "next/link";
import { StandingsTable } from "@/components/standings/standings-table";
import { GroupTables } from "@/components/competition/competition-views";
import { TableFilters } from "@/components/layout/filters-bar";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { getStandingsBySport } from "@/lib/data/get-by-sport";
import {
  getGroupStandingsForTournament,
  getTournamentForSport,
} from "@/lib/data/demo-competition";
import { parseSportParam, sportToDbId, SPORT_LABELS } from "@/lib/utils/sport";

export const metadata = { title: "Table" };

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  const sportDbId = sportToDbId(activeSport);
  const tournament = getTournamentForSport(sportDbId, competition);
  const isLeague = !tournament || tournament.competition_type !== "cup";
  const leagueRows = getStandingsBySport(activeSport);
  const groupRows = tournament ? getGroupStandingsForTournament(tournament.id) : [];

  return (
    <>
      <BrandedSection
        title={tournament ? `${tournament.name} Table` : `${SPORT_LABELS[activeSport]} Table`}
        activeSport={activeSport}
      />
      <PageContent>
        <TableFilters sport={activeSport} competitionId={tournament?.id} />
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          {isLeague ? (
            <StandingsTable rows={leagueRows} sport={activeSport} />
          ) : groupRows.length > 0 ? (
            <GroupTables rows={groupRows} sport={activeSport} />
          ) : (
            <div className="table-card p-10 text-center text-sm opacity-70">
              {tournament?.name} is a straight knockout — no table.{" "}
              <Link
                href={`/competition?sport=${activeSport}&competition=${tournament?.id}`}
                className="font-bold text-accent underline underline-offset-2"
              >
                View the bracket
              </Link>
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
}
