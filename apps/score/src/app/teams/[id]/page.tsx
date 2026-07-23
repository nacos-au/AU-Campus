import { StandingsTable } from "@/components/standings/standings-table";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { PlayerAvatar } from "@/components/ui/team-crest";
import { DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/data/demo";
import { getStandingsBySport } from "@/lib/data/get-by-sport";
import { parseSportParam } from "@/lib/utils/sport";
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
  const standing = standings.find((s) => s.team_id === id);
  const squad = DEMO_PLAYERS.filter((p) => p.department_id === team.department_id);

  return (
    <>
      <BrandedSection title={team.name} activeSport={activeSport} />
      <PageContent>
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
          {standing && (
            <p className="mb-8 text-sm opacity-70">
              #{standings.indexOf(standing) + 1} in league · {standing.points} points
            </p>
          )}

          <h2 className="mb-4 font-display text-lg font-extrabold">Squad</h2>
          <div className="table-card mb-12 divide-y divide-rule">
            {squad.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}?sport=${activeSport}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-wrapper"
              >
                <PlayerAvatar
                  firstName={player.first_name}
                  lastName={player.last_name}
                  avatarUrl={player.avatar_url}
                />
                <div>
                  <p className="font-display font-bold">
                    {player.first_name} {player.last_name}
                  </p>
                  <p className="text-sm opacity-70">
                    {player.position} · {player.matric_number}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <StandingsTable rows={standings} sport={activeSport} highlightTeamId={id} />
        </div>
      </PageContent>
    </>
  );
}
