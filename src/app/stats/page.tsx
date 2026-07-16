import Link from "next/link";
import { StatLeaderCard } from "@/components/stats/stat-leader-card";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { SectionTitle } from "@/components/layout/site-header";
import { getStatLabelsBySport, getStatLeadersBySport } from "@/lib/data/get-by-sport";
import { parseSportParam, SPORT_LABELS } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Stats Centre" };

const statsTabs = [
  { href: "/stats", label: "Dashboard" },
  { href: "/stats/players", label: "Player" },
  { href: "/teams", label: "Club" },
  { href: "/stats/players", label: "All-time Stats" },
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const activeSport = parseSportParam(sport);
  const leaders = getStatLeadersBySport(activeSport);
  const [l1, l2, l3, l4] = getStatLabelsBySport(activeSport);

  return (
    <>
      <BrandedSection title="Stats Centre" activeSport={activeSport} />
      <PageContent>
        <nav className="border-b border-rule bg-wrapper">
          <div className="mx-auto flex max-w-[1200px] gap-6 overflow-x-auto px-4 sm:px-6">
            {statsTabs.map(({ href, label }) => (
              <Link
                key={label}
                href={`${href}?sport=${activeSport}`}
                className={cn(
                  "shrink-0 py-3 font-display text-sm font-semibold",
                  label === "Dashboard" && "border-b-2 border-accent"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <SectionTitle>
            {SPORT_LABELS[activeSport]} 2025/26 Player Stats
          </SectionTitle>
          <div className="scroll-snap-x -mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            <div className="w-[260px] shrink-0 sm:w-auto">
              <StatLeaderCard title={l1} leaders={leaders.goals} sport={activeSport} href={`/stats/players?sport=${activeSport}`} />
            </div>
            <div className="w-[260px] shrink-0 sm:w-auto">
              <StatLeaderCard title={l2} leaders={leaders.assists} sport={activeSport} href={`/stats/players?sport=${activeSport}`} />
            </div>
            <div className="w-[260px] shrink-0 sm:w-auto">
              <StatLeaderCard title={l3} leaders={leaders.passes} sport={activeSport} href={`/stats/players?sport=${activeSport}`} />
            </div>
            <div className="w-[260px] shrink-0 sm:w-auto">
              <StatLeaderCard title={l4} leaders={leaders.cleanSheets} sport={activeSport} href={`/stats/players?sport=${activeSport}`} />
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
