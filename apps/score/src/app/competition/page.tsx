import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import {
  CompetitionTimeline,
  GroupTables,
  KnockoutBracket,
  MeetSchedule,
} from "@/components/competition/competition-views";
import { WorldCupBracket } from "@/components/competition/world-cup-bracket";
import { TitleHolderBanner } from "@/components/competition/title-holder-banner";
import { CompetitionPageFilters } from "@/components/layout/filters-bar";
import { SportComingSoon } from "@/components/layout/sport-coming-soon";
import { StandingsTable } from "@/components/standings/standings-table";
import { ShareControls } from "@/components/share/share-controls";
import {
  formatTournamentRules,
  getBracketFixturesForTournament,
  getGroupStandingsForTournament,
  getMeetEventsForTournament,
  getTournamentForSport,
} from "@/lib/data/demo-competition";
import { getStandingsBySport } from "@/lib/data/get-by-sport";
import { sportSupportsNextMatch } from "@/lib/standings/next-match";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  fetchBracketFixtures,
  fetchGroupStandings,
  fetchLeagueStandings,
  fetchMeetEvents,
  fetchTournamentForSport,
} from "@/lib/data/repository";
import {
  isPublicSportOnboarded,
  parseSportParam,
  sportToDbId,
  SPORT_LABELS,
} from "@/lib/utils/sport";
import { ChevronDown } from "lucide-react";
import type { Tournament } from "@/lib/types/database";
import { formatDescription, formatLabel } from "@/lib/competition/format-labels";

/** Collapsible competition facts: type, format, season, rules, awards. */
function CompetitionDetails({
  tournament,
  rules,
  regulations,
  isLeague,
}: {
  tournament: Tournament;
  rules: string[];
  regulations: string[];
  isLeague: boolean;
}) {
  const facts: { label: string; value: string; hint?: string }[] = [
    { label: "Type", value: isLeague ? "League" : "Cup" },
    ...(tournament.format
      ? [{ label: "Format", value: formatLabel(tournament.format), hint: formatDescription(tournament.format) }]
      : []),
    { label: "Season", value: tournament.season },
    {
      label: "Season awards",
      value: isLeague
        ? "Team of the Season · Player of the Season"
        : "Team of the Tournament · Player of the Tournament",
    },
    ...(tournament.title_holder
      ? [{ label: "Title holder", value: `${tournament.title_holder.team_name} (${tournament.title_holder.season})` }]
      : [{ label: "Title holder", value: "Nil — maiden edition" }]),
    ...(tournament.phases
      ? [{ label: "Phases", value: tournament.phases.map((p) => p.label).join(" → ") }]
      : []),
  ];

  return (
    <details className="group table-card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-display text-sm font-extrabold [&::-webkit-details-marker]:hidden">
        Competition details
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-rule px-5 py-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-bold uppercase opacity-50">{f.label}</dt>
              <dd className="mt-0.5 font-semibold">
                {f.value}
                {f.hint && <p className="mt-1 text-xs font-normal leading-snug opacity-60">{f.hint}</p>}
              </dd>
            </div>
          ))}
          {rules.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase opacity-50">Match rules</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {rules.map((rule) => (
                  <span key={rule} className="rounded-lg border border-rule bg-white px-3 py-1.5 font-semibold">
                    {rule}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {regulations.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase opacity-50">Regulations</dt>
              <dd className="mt-2 space-y-1.5">
                {regulations.map((line) => (
                  <p key={line} className="text-sm leading-snug opacity-80">
                    {line}
                  </p>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </details>
  );
}

function regulationsFromConfig(config: Tournament["config"]): string[] {
  const raw = config?.regulations;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  const qs = new URLSearchParams({ sport: activeSport });
  if (competition) qs.set("competition", competition);
  return {
    title: "Competition",
    openGraph: {
      title: `${SPORT_LABELS[activeSport]} competition`,
      images: [{ url: `/competition/opengraph-image?${qs.toString()}` }],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export const dynamic = "force-dynamic";

export default async function CompetitionPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  if (!isPublicSportOnboarded(activeSport)) {
    return (
      <>
        <BrandedSection title="Competition" activeSport={activeSport} />
        <PageContent>
          <SportComingSoon sport={activeSport} />
        </PageContent>
      </>
    );
  }
  const sportDbId = sportToDbId(activeSport);
  const demo = await getScoreDemoMode();
  const shareQs = new URLSearchParams({ sport: activeSport });
  if (competition) shareQs.set("competition", competition);

  const tournament = demo
    ? getTournamentForSport(sportDbId, competition)
    : await fetchTournamentForSport(sportDbId, competition);

  if (!tournament) {
    return (
      <>
        <BrandedSection title="Competition" activeSport={activeSport} />
        <PageContent>
          <CompetitionPageFilters sport={activeSport} />
          <div className="mx-auto max-w-[1200px] px-4 py-10 text-center sm:px-6">
            <p className="opacity-70">
              {demo
                ? `No competitions for ${SPORT_LABELS[activeSport]} in demo data yet.`
                : `No published competitions for ${SPORT_LABELS[activeSport]} yet.`}
            </p>
          </div>
        </PageContent>
      </>
    );
  }

  const rules = formatTournamentRules(tournament.rules, sportDbId);
  const regulations = regulationsFromConfig(tournament.config);
  const isLeague = tournament.competition_type === "league" || tournament.category === "league";
  const groupStandings = demo
    ? getGroupStandingsForTournament(tournament.id)
    : await fetchGroupStandings(sportDbId, tournament.id);
  const bracketFixtures = demo
    ? getBracketFixturesForTournament(tournament.id)
    : await fetchBracketFixtures(sportDbId, tournament.id);
  const meetEvents = demo
    ? getMeetEventsForTournament(tournament.id)
    : await fetchMeetEvents(sportDbId, tournament.id);
  const leagueStandings = isLeague
    ? demo
      ? getStandingsBySport(activeSport, tournament.id)
      : await fetchLeagueStandings(sportDbId, tournament.id)
    : [];
  const showNextMatch = isLeague && sportSupportsNextMatch(activeSport);
  const isTrack = sportDbId === "sport-track";
  const isTennis = sportDbId === "sport-tennis";

  return (
    <>
      <BrandedSection title={tournament.name} activeSport={activeSport} />
      <PageContent>
        <CompetitionPageFilters sport={activeSport} competitionId={tournament.id} />

        <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:px-6">
          <div className="flex justify-end">
            <ShareControls
              title={tournament.name}
              path={`/competition?${shareQs.toString()}`}
              posterPath={`/competition/opengraph-image?${shareQs.toString()}`}
            />
          </div>

          {tournament.title_holder && (
            <TitleHolderBanner holder={tournament.title_holder} />
          )}

          {tournament.phases && (
            <CompetitionTimeline phases={tournament.phases} tournament={tournament} />
          )}

          <CompetitionDetails
            tournament={tournament}
            rules={rules}
            regulations={regulations}
            isLeague={isLeague}
          />

          {isLeague && leagueStandings.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">League Table</h2>
              <StandingsTable rows={leagueStandings} sport={activeSport} showNextMatch={showNextMatch} />
            </section>
          )}

          {tournament.format === "group_knockout" && groupStandings.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">
                {sportDbId === "sport-basketball" ? "Pool Standings" : sportDbId === "sport-volleyball" ? "Pool Play" : "Group Stage"}
              </h2>
              <GroupTables rows={groupStandings} sport={activeSport} />
            </section>
          )}

          {isTrack && meetEvents.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">Meet Schedule</h2>
              <MeetSchedule events={meetEvents} sport={activeSport} />
            </section>
          )}

          {!isTrack && bracketFixtures.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-extrabold">
                {isTennis ? "Singles Knockout Bracket" : "Knockout Bracket"}
              </h2>
              {tournament.format === "group_knockout" && sportDbId === "sport-football" ? (
                <WorldCupBracket fixtures={bracketFixtures} sport={activeSport} tournamentName={tournament.name} />
              ) : (
                <KnockoutBracket fixtures={bracketFixtures} sport={activeSport} playerMode={isTennis} />
              )}
            </section>
          )}

          {!isLeague && bracketFixtures.length === 0 && groupStandings.length === 0 && meetEvents.length === 0 && (
            <p className="rounded-lg border border-dashed border-rule px-4 py-6 text-center text-sm opacity-60">
              Draw not made yet — fixtures appear here once the competition is set up.
            </p>
          )}
        </div>
      </PageContent>
    </>
  );
}
