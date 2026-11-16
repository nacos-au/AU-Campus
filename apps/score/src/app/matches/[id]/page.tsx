import { WinProbabilityVote } from "@/components/match/win-probability";
import { MatchPageLiveBlock } from "@/components/match/match-page-live-block";
import { PrematchHero } from "@/components/match/prematch-hero";
import { MatchEventsList } from "@/components/match/match-events-list";
import { FootballMatchTimeline } from "@/components/match/football-match-timeline";
import { ManOfTheMatchCard } from "@/components/match/man-of-the-match";
import { HeadToHeadCard } from "@/components/match/head-to-head-card";
import { MatchInfoPanel } from "@/components/match/match-info-panel";
import { DoublesLineup, MatchRulesBanner, PenaltyShootoutScore } from "@/components/match/match-rules";
import { PeriodScoresTable, SetScoresTable } from "@/components/match/period-scores";
import { TrackResultsTable } from "@/components/match/track-results";
import { PodiumDisplay } from "@/components/match/podium-display";
import { MatchLineupsSection } from "@/components/match/match-lineups-section";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { MatchLiveEventsPoller } from "@/components/match/match-live-events-poller";
import { FeedbackLauncher } from "@/components/feedback/feedback-launcher";
import {
  getPeriodScoresForMatch,
  getSetScoresForMatch,
  getTrackResultsForMatch,
} from "@/lib/data/demo-match-details";
import {
  fetchMatchById,
  fetchMatchEvents,
  fetchPeriodScores,
  fetchSetScores,
  fetchTrackResults,
} from "@/lib/data/repository";
import { dbIdToSport, parseSportParam } from "@/lib/utils/sport";
import { getSportConfig, scoreUnitLabel } from "@/lib/utils/sport-config";
import {
  podiumFromPointsMatch,
  podiumFromTeamScore,
  podiumFromTrackResults,
} from "@/lib/match/podium";
import { getManOfTheMatch, getMatchMeta } from "@/lib/match/match-meta";
import { supportsHeadToHead } from "@/lib/match/head-to-head";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) return { title: "Match" };
  const sport = dbIdToSport(match.sport_id);
  const config = getSportConfig(sport);
  const title = config.isEventSport
    ? (match.home_team?.name ?? "Event")
    : `${match.home_team?.name} vs ${match.away_team?.name}`;
  return {
    title,
    openGraph: {
      title,
      images: [{ url: `/matches/${id}/opengraph-image` }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
    },
  };
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
  const match = await fetchMatchById(id);
  if (!match) notFound();

  const matchSport = dbIdToSport(match.sport_id);
  const activeSport = parseSportParam(sport ?? matchSport);
  const config = getSportConfig(matchSport);
  const events = await fetchMatchEvents(id);
  const livePeriodScores = await fetchPeriodScores(id);
  const periodScores = livePeriodScores.length ? livePeriodScores : getPeriodScoresForMatch(id);
  const liveSetScores = await fetchSetScores(id);
  const setScores = liveSetScores.length ? liveSetScores : getSetScoresForMatch(id);
  const liveTrack = await fetchTrackResults(id);
  const trackResults = liveTrack.length ? liveTrack : getTrackResultsForMatch(id);
  const isLive = match.status === "live" || match.status === "paused";
  const isCompleted = match.status === "completed";
  const isPrematch = match.status === "scheduled" || match.status === "postponed";
  const homeName = match.home_team?.name ?? "Home";
  const awayName = match.away_team?.name ?? "Away";
  const motm = isCompleted ? getManOfTheMatch(id) : null;
  const matchMeta = getMatchMeta(match);

  const title = config.isEventSport
    ? (match.home_team?.name ?? "Event")
    : `${homeName} vs ${awayName}`;

  const showSetScores =
    !isPrematch && (matchSport === "tennis" || matchSport === "volleyball");
  const showPeriodScores =
    !isPrematch &&
    (matchSport === "basketball" || (matchSport === "football" && periodScores.length > 0));

  const podium =
    !isPrematch && config.isEventSport && trackResults.length > 0
      ? podiumFromTrackResults(trackResults)
      : isCompleted && (matchSport === "tennis" || matchSport === "volleyball")
        ? podiumFromTeamScore(
            homeName,
            awayName,
            match.home_score,
            match.away_score,
            match.home_team_id ?? undefined,
            match.away_team_id ?? undefined
          )
        : isCompleted && (matchSport === "football" || matchSport === "basketball")
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
      <BrandedSection title={title} activeSport={activeSport} showSubNav={false} />
      <PageContent>
        <MatchRulesBanner match={match} sport={matchSport} />
        <div className="border-b border-rule py-6 sm:py-10">
          <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6">
            {match.status === "postponed" && (
              <p className="mb-4">
                <span className="rounded-full bg-amber-100 px-3 py-1 font-display text-xs font-bold text-amber-900">
                  Postponed
                </span>
              </p>
            )}
            <DoublesLineup match={match} />

            {isPrematch && match.status === "scheduled" ? (
              <PrematchHero match={match} sport={matchSport} />
            ) : isPrematch ? null : (
              <MatchPageLiveBlock
                match={match}
                events={events}
                sport={matchSport}
                isEventSport={config.isEventSport}
              />
            )}
            {!isPrematch && <PenaltyShootoutScore match={match} />}
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-10 sm:px-6">
          {podium && podium.entries.length > 0 && (
            <PodiumDisplay podium={podium} sport={matchSport} />
          )}

          {!config.isEventSport && matchSport !== "tennis" && (
            <MatchLineupsSection match={match} events={isPrematch ? [] : events} />
          )}

          {!isPrematch && config.isEventSport && trackResults.length > 0 && (
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

          {!isPrematch &&
            (isLive ? (
              <MatchLiveEventsPoller
                matchId={id}
                initialEvents={events}
                match={match}
                sport={matchSport}
                periodScores={periodScores}
                isCompleted={isCompleted}
              />
            ) : matchSport === "football" && events.length > 0 ? (
              <FootballMatchTimeline
                events={events}
                homeTeamId={match.home_team_id ?? ""}
                awayTeamId={match.away_team_id ?? ""}
                homeScore={match.home_score}
                awayScore={match.away_score}
                periodScores={periodScores}
                isCompleted={isCompleted}
                sport={matchSport}
                boardedStoppageMinutes={match.clock_boarded_stoppage_minutes}
              />
            ) : (
              <MatchEventsList
                events={events}
                sport={matchSport}
                title={config.isEventSport ? "Event Timeline" : "Match Events"}
              />
            ))}

          {!isPrematch && config.showWinProbability && match.win_probability && (
            <WinProbabilityVote
              matchId={match.id}
              data={match.win_probability}
              showDraw={config.showDraw}
              isCompleted={isCompleted}
              homeTeam={{
                name: homeName,
                logoUrl: match.home_team?.logo_url,
                shortCode: match.home_team?.department?.short_code ?? "H",
              }}
              awayTeam={{
                name: awayName,
                logoUrl: match.away_team?.logo_url,
                shortCode: match.away_team?.department?.short_code ?? "A",
              }}
            />
          )}

          {motm && <ManOfTheMatchCard motm={motm} sport={matchSport} />}

          {supportsHeadToHead(matchSport) && match.home_team_id && match.away_team_id && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">Head-to-Head</h2>
              <HeadToHeadCard
                sport={matchSport}
                teamAId={match.home_team_id}
                teamAName={homeName}
                teamBId={match.away_team_id}
                teamBName={awayName}
                excludeMatchId={match.id}
              />
            </section>
          )}

          {!config.isEventSport && <MatchInfoPanel match={match} meta={matchMeta} />}
        </div>
      </PageContent>
      <FeedbackLauncher matchId={match.id} />
    </>
  );
}
