import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { PlayerAvatar } from "@/components/ui/team-crest";
import { DEMO_PLAYERS } from "@/lib/data/demo";
import { getSportConfig } from "@/lib/data/get-by-sport";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  fetchPlayerById,
  fetchPlayerCareerStats,
  fetchPlayerClubForSport,
} from "@/lib/data/roster";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { footballStatTiles, type PlayerStatTile } from "@/lib/players/player-stats";
import { parseSportParam } from "@/lib/utils/sport";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = hasSupabaseConfig()
    ? await fetchPlayerById(id)
    : DEMO_PLAYERS.find((p) => p.id === id) ?? null;
  return { title: player ? `${player.first_name} ${player.last_name}` : "Player" };
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sport?: string }>;
}) {
  const { id } = await params;
  const { sport } = await searchParams;
  const activeSport = parseSportParam(sport);
  const config = getSportConfig(activeSport);
  const demo = !hasSupabaseConfig() || (await getScoreDemoMode());

  const player = hasSupabaseConfig()
    ? await fetchPlayerById(id)
    : DEMO_PLAYERS.find((p) => p.id === id) ?? (await fetchPlayerById(id));

  if (!player) notFound();

  const club = await fetchPlayerClubForSport(player.id, activeSport);

  // Demo profiles keep the sample numbers. Live profiles only ever show real
  // match data, so a sport with no event pipeline shows no tiles at all.
  let tiles: PlayerStatTile[] = [];
  let statsUnavailable = false;
  if (demo) {
    tiles = config.playerStats.map((s) => {
      const raw = s.value(player.position ?? "");
      const value =
        s.label === "FG%" && typeof raw === "number" && raw < 1
          ? `.${Math.round(raw * 1000).toString().padStart(3, "0")}`
          : raw;
      return { label: s.label, value };
    });
  } else if (activeSport === "football") {
    const career = await fetchPlayerCareerStats(player.id, activeSport);
    if (career) tiles = footballStatTiles(career);
    else statsUnavailable = true;
  }

  const department = player.department?.name ?? null;
  const details: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Club",
      value: club ? (
        <Link
          href={`/teams/${club.team_id}?sport=${activeSport}`}
          className="font-semibold text-accent hover:underline"
        >
          {club.team_name}
        </Link>
      ) : null,
    },
    { label: "Position", value: player.position },
    { label: "Number", value: club?.jersey_number != null ? `#${club.jersey_number}` : null },
    { label: "Department", value: department },
    { label: "Matric no.", value: player.matric_number },
  ];
  const shownDetails = details.filter((d) => d.value);

  return (
    <>
      <BrandedSection
        title={`${player.first_name} ${player.last_name}`}
        activeSport={activeSport}
      />
      <PageContent>
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
          <div className="mb-8 flex items-center gap-5">
            <PlayerAvatar
              firstName={player.first_name}
              lastName={player.last_name}
              avatarUrl={player.avatar_url}
              size="md"
            />
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold">
                {player.first_name} {player.last_name}
              </h2>
              {player.nickname?.trim() && (
                <p className="text-sm font-semibold text-accent/60">“{player.nickname.trim()}”</p>
              )}
              <p className="text-sm opacity-70">{club?.team_name ?? config.label}</p>
            </div>
          </div>

          {shownDetails.length > 0 && (
            <dl className="table-card mb-8 grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-5">
              {shownDetails.map((d) => (
                <div key={d.label} className="min-w-0">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-accent/50">
                    {d.label}
                  </dt>
                  <dd className="mt-1 truncate text-sm">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {tiles.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {tiles.map((s) => (
                <div key={s.label} className="table-card p-6 text-center">
                  <p className="font-display text-3xl font-extrabold">{s.value}</p>
                  <p className="mt-1 text-sm opacity-70">{s.label}</p>
                  {s.note && <p className="mt-1 text-xs opacity-50">{s.note}</p>}
                </div>
              ))}
            </div>
          )}
          {statsUnavailable && (
            <p className="table-card px-5 py-6 text-center text-sm opacity-70">
              Stats are unavailable right now. Try again shortly.
            </p>
          )}
          {!demo && activeSport === "football" && tiles.length > 0 && (
            <p className="mt-3 text-xs text-accent/50">
              Totals from completed matches only.
            </p>
          )}
        </div>
      </PageContent>
    </>
  );
}
