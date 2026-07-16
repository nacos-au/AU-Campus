import { StandingsTable } from "@/components/standings/standings-table";
import { BrandedSection } from "@/components/layout/branded-section";
import { TableFilters } from "@/components/layout/filters-bar";
import { PageContent } from "@/components/layout/page-content";
import { getStandingsBySport } from "@/lib/data/get-by-sport";
import { parseSportParam, SPORT_LABELS } from "@/lib/utils/sport";

export const metadata = { title: "Table" };

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const activeSport = parseSportParam(sport);
  const rows = getStandingsBySport(activeSport);

  return (
    <>
      <BrandedSection
        title={`${SPORT_LABELS[activeSport]} Table`}
        activeSport={activeSport}
      />
      <PageContent>
        <TableFilters sport={activeSport} />
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <StandingsTable rows={rows} sport={activeSport} />
        </div>
      </PageContent>
    </>
  );
}
