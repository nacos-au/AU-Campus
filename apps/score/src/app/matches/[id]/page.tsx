import { WinProbabilityBars } from "@/components/match/win-probability";
import { MatchPageLiveBlock } from "@/components/match/match-page-live-block";
import { MatchLifecycleBadge } from "@/components/match/match-lifecycle-badge";
import { MatchEventsList } from "@/components/match/match-events-list";
import { DoublesLineup, MatchRulesBanner, PenaltyShootoutScore } from "@/components/match/match-rules";
import { PeriodScoresTable, SetScoresTable } from "@/components/match/period-scores";
import { TrackResultsTable } from "@/components/match/track-results";
import { PodiumDisplay } from "@/components/match/podium-display";
import { MatchLineupsSection } from "@/components/match/match-lineups-section";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { DEMO_MATCHES } from "@/lib/data/demo";
import {
  getEventsForMatch,
  getPeriodScoresForMatch,
  getSetScoresForMatch,
  getTrackResultsForMatch,
} from "@/lib/data/demo-match-details";
import { dbIdToSport, parseSportParam } from "@/lib/utils/sport";
import { getSportConfig, scoreUnitLabel } from "@/lib/utils/sport-config";
import {
  podiumFromPointsMatch,
  podiumFromTeamScore,
  podiumFromTrackResults,
} from "@/lib/match/podium";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = DEMO_MATCHES.find((m) => m.id === id);
  if (!match) return { title: "Match" };
  const sport = dbIdToSport(match.sport_id);
  const config = getSportConfig(sport);
  if (config.isEventSport) {
    return { title: match.home_team?.name ?? "Event" };
  }
  return { title: `${match.home_team?.name} vs ${match.away_team?.name}` };
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sport?: string }>;
}) {
  const { id } = await params;
  const { sport } = await searchParams;
  const match = DEMO_MATCHES.find((m) => m.id === id);
  if (!match) notFound();

  const matchSport = dbIdToSport(match.sport_id);
  const activeSport = parseSportParam(sport ?? matchSport);
  const config = getSportConfig(matchSport);
  const events = getEventsForMatch(id);
  const periodScores = getPeriodScoresForMatch(id);
  const setScores = getSetScoresForMatch(id);
  const trackResults = getTrackResultsForMatch(id);
  const isLive = match.status === "live";
  const homeName = match.home_team?.name ?? "Home";
  const awayName = match.away_team?.name ?? "Away";

  const title = config.isEventSport
    ? (match.home_team?.name ?? "Event")
    : `${homeName} vs ${awayName}`;

  const showSetScores = matchSport === "tennis" || matchSport === "volleyball";
  const showPeriodScores = matchSport === "basketball" || (matchSport === "football" && periodScores.length > 0);

  const podium =
    config.isEventSport && trackResults.length > 0
      ? podiumFromTrackResults(trackResults)
      : match.status === "completed" && (matchSport === "tennis" || matchSport === "volleyball")
        ? podiumFromTeamScore(
            homeName,
            awayName,
            match.home_score,
            match.away_score,
            match.home_team_id ?? undefined,
            match.away_team_id ?? undefined
          )
        : match.status === "completed" && (matchSport === "football" || matchSport === "basketball")
          ? podiumFromPointsMatch(
              homeName,
              awayName,
              match.home_score,
              match.away_score,
              scoreUnitLabel(config.scoreUnit) ?? "pts",
              match.home_team_id ?? undefined,
              match.away_team_id ?? undefined
            )
          : null;

  return (
    <>
      <BrandedSection title={title} activeSport={activeSport} />
      <PageContent>
        <MatchRulesBanner match={match} />
        <div className="border-b border-rule py-10">
          <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6">
            <p className="mb-4 flex flex-wrap items-center justify-center gap-2 text-sm opacity-70">
              <MatchLifecycleBadge
                matchId={match.id}
                initialStatus={match.status as "scheduled" | "live" | "completed"}
                scheduledAt={match.scheduled_at}
              />
              <Link href={`/competition?sport=${matchSport}`} className="hover:underline">
                {match.tournament?.name}
              </Link>
            </p>
            <DoublesLineup match={match} />

            <MatchPageLiveBlock match={match} events={events} sport={matchSport} isEventSport={config.isEventSport} />
            <PenaltyShootoutScore match={match} />
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-10 sm:px-6">
          {podium && podium.entries.length > 0 && (
            <PodiumDisplay podium={podium} sport={matchSport} />
          )}

          {!config.isEventSport && matchSport !== "tennis" && (
            <MatchLineupsSection match={match} />
          )}

          {config.isEventSport && trackResults.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">Results</h2>
              <TrackResultsTable results={trackResults} sport={matchSport} />
            </section>
          )}

          {showPeriodScores && periodScores.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">
                {matchSport === "football" ? "Match Breakdown" : "Quarter Scores"}
              </h2>
              <PeriodScoresTable scores={periodScores} homeLabel={homeName} awayLabel={awayName} />
            </section>
          )}

          {showSetScores && setScores.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">
                {matchSport === "tennis" ? "Set Scores" : "Set Breakdown"}
              </h2>
              <SetScoresTable scores={setScores} homeLabel={homeName} awayLabel={awayName} />
            </section>
          )}

          <div className="grid gap-10 lg:grid-cols-3">
            <div className={config.showWinProbability && match.win_probability ? "lg:col-span-2" : "lg:col-span-3"}>
              <MatchEventsList
                events={events}
                sport={matchSport}
                title={config.isEventSport ? "Event Timeline" : "Match Events"}
              />
            </div>

            {config.showWinProbability && match.win_probability && (
              <aside className="table-card h-fit p-5">
                <h3 className="mb-4 font-display text-sm font-extrabold uppercase">Win Probability</h3>
                <WinProbabilityBars data={match.win_probability} showDraw={config.showDraw} />
              </aside>
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
