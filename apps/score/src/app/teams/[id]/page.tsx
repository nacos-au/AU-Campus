import { StandingsTable } from "@/components/standings/standings-table";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { DEMO_DEPARTMENTS, DEMO_TEAMS } from "@/lib/data/demo";
import { getClubCompetitions, getSquadRosterEntries, groupSquadByRole } from "@/lib/data/demo-squads";
import { getStandingsBySport } from "@/lib/data/get-by-sport";
import { parseSportParam, sportToDbId } from "@/lib/utils/sport";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = DEMO_TEAMS.find((t) => t.id === id);
  return { title: team?.name ?? "Club" };
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sport?: string }>;
}) {
  const { id } = await params;
  const { sport } = await searchParams;
  const activeSport = parseSportParam(sport);
  const team = DEMO_TEAMS.find((t) => t.id === id);
  if (!team) notFound();

  const standings = getStandingsBySport(activeSport);
  const squad = getSquadRosterEntries(id);
  const squadGroups = groupSquadByRole(squad, sportToDbId(activeSport));
  const competitions = getClubCompetitions(id);
  const dept = DEMO_DEPARTMENTS.find((d) => d.id === team.department_id);

  return (
    <>
      <BrandedSection title={team.name} activeSport={activeSport} />
      <PageContent>
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
          <div className="mb-8 flex items-center gap-4">
            <TeamCrest code={dept?.short_code ?? "AU"} logoUrl={team.logo_url} alt={team.name} size="lg" />
            <div>
              <h1 className="font-display text-2xl font-extrabold">{team.name}</h1>
            </div>
          </div>

          {competitions.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide opacity-60">
                Competitions
              </h2>
              <div className="flex flex-wrap gap-3">
                {competitions.map((c) => (
                  <Link
                    key={c.tournament_id}
                    href={c.href}
                    className="interactive-btn rounded-lg border border-rule bg-white px-4 py-3 font-display text-sm font-bold shadow-sm"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <h2 className="mb-4 font-display text-lg font-extrabold">Squad</h2>
          <div className="table-card mb-12 overflow-hidden">
            {squadGroups.map(({ role, players }) => (
              <div key={role}>
                <p className="border-b border-rule bg-surface px-5 py-2 font-display text-xs font-extrabold uppercase tracking-wide opacity-60">
                  {role}
                </p>
                {players.map((player, idx) => (
                  <Link
                    key={`${role}-${player.id}-${player.jersey_number ?? idx}`}
                    href={`/players/${player.id}?sport=${activeSport}`}
                    className="interactive-row flex items-center gap-4 px-5 py-3"
                  >
                    <span className="w-8 text-center font-display text-sm font-extrabold opacity-40">
                      {player.jersey_number ?? "—"}
                    </span>
                    <PlayerAvatar
                      firstName={player.first_name}
                      lastName={player.last_name}
                      avatarUrl={player.avatar_url}
                    />
                    <div>
                      <p className="font-display font-bold">
                        {player.first_name} {player.last_name}
                      </p>
                      <p className="text-sm opacity-70">{player.squad_role}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
            {squad.length === 0 && (
              <p className="p-8 text-center opacity-70">No squad registered yet.</p>
            )}
          </div>

          <StandingsTable rows={standings} sport={activeSport} highlightTeamId={id} />
        </div>
      </PageContent>
    </>
  );
}
