import Link from "next/link";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { TeamCrest } from "@/components/ui/team-crest";
import { DEMO_DEPARTMENTS, DEMO_TEAMS } from "@/lib/data/demo";
import { getSportConfig } from "@/lib/data/get-by-sport";
import { parseSportParam, sportToDbId, SPORT_LABELS } from "@/lib/utils/sport";

export const metadata = { title: "Clubs" };

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const activeSport = parseSportParam(sport);
  const sportDbId = sportToDbId(activeSport);
  const teams = DEMO_TEAMS.filter((t) => t.sport_id === sportDbId);

  return (
    <>
      <BrandedSection
        title={`${SPORT_LABELS[activeSport]} ${getSportConfig(activeSport).clubsLabel}`}
        activeSport={activeSport}
      />
      <PageContent>
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <div className="table-card divide-y divide-rule">
            {teams.length === 0 ? (
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
