import Link from "next/link";
import { StandingsTable } from "@/components/standings/standings-table";
import { GroupTables } from "@/components/competition/competition-views";
import { TableFilters } from "@/components/layout/filters-bar";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { SportComingSoon } from "@/components/layout/sport-coming-soon";
import { getStandingsBySport } from "@/lib/data/get-by-sport";
import { sportSupportsNextMatch } from "@/lib/standings/next-match";
import {
  getGroupStandingsForTournament,
  getTournamentForSport,
} from "@/lib/data/demo-competition";
import { getScoreDemoMode } from "@/lib/data/mode";
import { fetchGroupStandings, fetchLeagueStandings, fetchTournamentForSport } from "@/lib/data/repository";
import {
  isPublicSportOnboarded,
  parseSportParam,
  sportToDbId,
  SPORT_LABELS,
} from "@/lib/utils/sport";

export const metadata = { title: "Table" };
export const dynamic = "force-dynamic";

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  if (!isPublicSportOnboarded(activeSport)) {
    return (
      <>
        <BrandedSection title="Table" activeSport={activeSport} />
        <PageContent>
          <SportComingSoon sport={activeSport} />
        </PageContent>
      </>
    );
  }
  const sportDbId = sportToDbId(activeSport);
  const demo = await getScoreDemoMode();
  const tournament = demo
    ? getTournamentForSport(sportDbId, competition)
    : await fetchTournamentForSport(sportDbId, competition);

  const isLeague = !tournament || tournament.competition_type !== "cup";
  const showNextMatch = isLeague && sportSupportsNextMatch(activeSport);

  const leagueRows = demo
    ? getStandingsBySport(activeSport, isLeague ? tournament?.id : undefined)
    : isLeague
      ? await fetchLeagueStandings(sportDbId, tournament?.id)
      : [];

  const groupRows = demo
    ? tournament
      ? getGroupStandingsForTournament(tournament.id)
      : []
    : !isLeague
      ? await fetchGroupStandings(sportDbId, tournament?.id)
      : [];

  return (
    <>
      <BrandedSection
        title={tournament ? `${tournament.name} Table` : `${SPORT_LABELS[activeSport]} Table`}
        activeSport={activeSport}
      />
      <PageContent>
        <TableFilters sport={activeSport} competitionId={tournament?.id} />
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          {!demo && !tournament ? (
            <div className="table-card p-10 text-center text-sm opacity-70">
              No published competitions for {SPORT_LABELS[activeSport]} yet.
            </div>
          ) : isLeague ? (
            leagueRows.length > 0 ? (
              <StandingsTable rows={leagueRows} sport={activeSport} showNextMatch={showNextMatch} />
            ) : (
              <div className="table-card p-10 text-center text-sm opacity-70">
                Table appears once clubs are registered for this competition.
              </div>
            )
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
