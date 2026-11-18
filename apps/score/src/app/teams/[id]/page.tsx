import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { DEMO_DEPARTMENTS, DEMO_TEAMS } from "@/lib/data/demo";
import { getSquadRosterEntries, groupSquadByRole } from "@/lib/data/demo-squads";
import { fetchSquadForTeam } from "@/lib/data/repository";
import { fetchTeamById } from "@/lib/data/roster";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { parseSportParam, sportToDbId } from "@/lib/utils/sport";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = hasSupabaseConfig()
    ? await fetchTeamById(id)
    : DEMO_TEAMS.find((t) => t.id === id) ?? null;
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
  const live = hasSupabaseConfig();

  const team = live
    ? await fetchTeamById(id)
    : (() => {
        const t = DEMO_TEAMS.find((x) => x.id === id);
        if (!t) return null;
        const dept = DEMO_DEPARTMENTS.find((d) => d.id === t.department_id);
        return { ...t, short_code: dept?.short_code ?? null };
      })();

  if (!team) notFound();

  const shortCode =
    team.short_code ??
    DEMO_DEPARTMENTS.find((d) => d.id === team.department_id)?.short_code ??
    "AU";

  const squad = live
    ? await fetchSquadForTeam(id, sportToDbId(activeSport))
    : getSquadRosterEntries(id);

  const squadGroups = live
    ? groupLiveSquad(squad)
    : groupSquadByRole(
        squad as ReturnType<typeof getSquadRosterEntries>,
        sportToDbId(activeSport)
      );

  return (
    <>
      <BrandedSection title={team.name} activeSport={activeSport} />
      <PageContent>
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
          <div className="mb-8 flex items-center gap-4">
            <TeamCrest code={shortCode} logoUrl={team.logo_url} alt={team.name} size="lg" />
            <div>
              <h1 className="font-display text-2xl font-extrabold">{team.name}</h1>
            </div>
          </div>

          <h2 className="mb-4 font-display text-lg font-extrabold">Squad</h2>
          <div className="table-card mb-12 overflow-hidden">
            {squadGroups.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-accent/60">No players registered yet.</p>
            ) : (
              squadGroups.map(({ role, players }) => (
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
                        {player.position && (
                          <p className="text-xs opacity-60">{player.position}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}

function groupLiveSquad(
  squad: Array<{
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    position: string | null;
    jersey_number?: number | null;
    squad_role?: string | null;
  }>
) {
  const map = new Map<string, typeof squad>();
  for (const p of squad) {
    const role = p.squad_role || p.position || "Squad";
    const list = map.get(role) ?? [];
    list.push(p);
    map.set(role, list);
  }
  return [...map.entries()].map(([role, players]) => ({ role, players }));
}
