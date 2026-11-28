import Link from "next/link";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { ClubsFilters } from "@/components/layout/filters-bar";
import { SportComingSoon } from "@/components/layout/sport-coming-soon";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { DEMO_DEPARTMENTS, DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/data/demo";
import {
  getRegisteredTeamIdsForTournament,
  getTournamentForSport,
} from "@/lib/data/demo-competition";
import { getSportConfig } from "@/lib/data/get-by-sport";
import { getScoreDemoMode } from "@/lib/data/mode";
import { clubCrestCode } from "@/lib/data/club-directory-query";
import { fetchClubDirectory, fetchTournamentForSport } from "@/lib/data/repository";
import {
  isPublicSportOnboarded,
  parseSportParam,
  sportToDbId,
  SPORT_LABELS,
} from "@/lib/utils/sport";

export const metadata = { title: "Clubs" };
export const dynamic = "force-dynamic";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; competition?: string }>;
}) {
  const { sport, competition } = await searchParams;
  const activeSport = parseSportParam(sport);
  const config = getSportConfig(activeSport);
  if (!isPublicSportOnboarded(activeSport)) {
    return (
      <>
        <BrandedSection
          title={`${SPORT_LABELS[activeSport]} ${config.clubsLabel}`}
          activeSport={activeSport}
        />
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
  const registeredIds =
    demo && tournament ? getRegisteredTeamIdsForTournament(tournament.id) : null;
  type ClubRow = { id: string; name: string; logo_url: string | null; code: string; subtitle: string | null };
  let clubs: ClubRow[];
  if (demo) {
    clubs = DEMO_TEAMS.filter(
      (t) => t.sport_id === sportDbId && (!registeredIds || registeredIds.includes(t.id))
    ).map((team) => {
      const dept = DEMO_DEPARTMENTS.find((d) => d.id === team.department_id);
      return {
        id: team.id,
        name: team.name,
        logo_url: team.logo_url,
        code: dept?.short_code ?? "AU",
        subtitle: null,
      };
    });
  } else {
    let live = await fetchClubDirectory(activeSport, tournament?.id);
    // A brand-new default competition may have no registered sides yet: show every club instead of nothing.
    if (!live.length && tournament && !competition) {
      live = await fetchClubDirectory(activeSport, null);
    }
    clubs = live.map((team) => ({
      id: team.id,
      name: team.name,
      logo_url: team.logo_url,
      code: clubCrestCode(team),
      subtitle: team.is_guest
        ? (team.institution?.trim() || "Guest side")
        : (team.department?.name ?? null),
    }));
  }
  const trackAthletes =
    demo && activeSport === "track"
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
            ) : clubs.length === 0 ? (
              <p className="p-8 text-center opacity-70">
                {tournament
                  ? "No clubs registered for this competition yet."
                  : "No clubs registered for this sport yet."}
              </p>
            ) : (
              clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/teams/${club.id}?sport=${activeSport}`}
                  className="interactive-row flex items-center justify-between px-5 py-5 hover:bg-wrapper"
                >
                  <div className="flex items-center gap-4">
                    <TeamCrest code={club.code} logoUrl={club.logo_url} alt={club.name} size="lg" />
                    <div>
                      <p className="font-display text-lg font-bold">{club.name}</p>
                      {club.subtitle && <p className="text-sm opacity-60">{club.subtitle}</p>}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
