import Link from "next/link";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { ClubsFilters } from "@/components/layout/filters-bar";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { DEMO_DEPARTMENTS, DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/data/demo";
import {
  getRegisteredTeamIdsForTournament,
  getTournamentForSport,
} from "@/lib/data/demo-competition";
import { getSportConfig } from "@/lib/data/get-by-sport";
import { parseSportParam, sportToDbId, SPORT_LABELS } from "@/lib/utils/sport";

export const metadata = { title: "Clubs" };

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  const sportDbId = sportToDbId(activeSport);
  const config = getSportConfig(activeSport);
  const tournament = getTournamentForSport(sportDbId, competition);
  const registeredIds = tournament ? getRegisteredTeamIdsForTournament(tournament.id) : null;
  const teams = DEMO_TEAMS.filter(
    (t) => t.sport_id === sportDbId && (!registeredIds || registeredIds.includes(t.id))
  );
  const trackAthletes =
    activeSport === "track"
      ? DEMO_PLAYERS.filter((p) => p.position === "Sprinter")
      : [];

  return (
    <>
      <BrandedSection
        title={
          tournament
            ? `${tournament.name} ${config.clubsLabel}`
            : `${SPORT_LABELS[activeSport]} ${config.clubsLabel}`
        }
        activeSport={activeSport}
      />
      <PageContent>
        <ClubsFilters sport={activeSport} competitionId={tournament?.id} />
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <div className="table-card divide-y divide-rule">
            {activeSport === "track" ? (
              trackAthletes.length === 0 ? (
                <p className="p-8 text-center opacity-70">No athletes registered yet.</p>
              ) : (
                trackAthletes.map((athlete) => {
                  const dept = DEMO_DEPARTMENTS.find((d) => d.id === athlete.department_id);
                  return (
                    <Link
                      key={athlete.id}
                      href={`/players/${athlete.id}?sport=${activeSport}`}
                      className="flex items-center justify-between px-5 py-5 hover:bg-wrapper"
                    >
                      <div className="flex items-center gap-4">
                        <PlayerAvatar
                          firstName={athlete.first_name}
                          lastName={athlete.last_name}
                          avatarUrl={athlete.avatar_url}
                        />
                        <div>
                          <p className="font-display text-lg font-bold">
                            {athlete.first_name} {athlete.last_name}
                          </p>
                          <p className="text-sm opacity-60">{dept?.name}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold opacity-60">{athlete.position}</span>
                    </Link>
                  );
                })
              )
            ) : teams.length === 0 ? (
              <p className="p-8 text-center opacity-70">No clubs registered for this sport yet.</p>
            ) : (
              teams.map((team) => {
                const dept = DEMO_DEPARTMENTS.find((d) => d.id === team.department_id);
                return (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}?sport=${activeSport}`}
                    className="flex items-center justify-between px-5 py-5 hover:bg-wrapper"
                  >
                    <div className="flex items-center gap-4">
                      <TeamCrest code={dept?.short_code ?? "AU"} logoUrl={team.logo_url} alt={team.name} size="lg" />
                      <p className="font-display text-lg font-bold">{team.name}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
