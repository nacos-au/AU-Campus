import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { PlayerAvatar } from "@/components/ui/team-crest";
import { DEMO_PLAYERS } from "@/lib/data/demo";
import { getSportConfig } from "@/lib/data/get-by-sport";
import { fetchPlayerById, fetchPlayerClubForSport } from "@/lib/data/roster";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { parseSportParam } from "@/lib/utils/sport";
import { notFound } from "next/navigation";

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

  const player = hasSupabaseConfig()
    ? await fetchPlayerById(id)
    : DEMO_PLAYERS.find((p) => p.id === id) ?? (await fetchPlayerById(id));

  if (!player) notFound();

  const club = await fetchPlayerClubForSport(player.id, activeSport);

  const stats = config.playerStats.map((s) => {
    const raw = s.value(player.position ?? "");
    const value =
      s.label === "FG%" && typeof raw === "number" && raw < 1
        ? `.${Math.round(raw * 1000).toString().padStart(3, "0")}`
        : raw;
    return { label: s.label, value };
  });

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
            <p className="text-sm opacity-70">
              {[player.position, club?.team_name ?? config.label, player.matric_number]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="table-card p-6 text-center">
                <p className="font-display text-3xl font-extrabold">{s.value}</p>
                <p className="mt-1 text-sm opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </PageContent>
    </>
  );
}
