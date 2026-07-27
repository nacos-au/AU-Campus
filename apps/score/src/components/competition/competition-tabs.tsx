import Link from "next/link";
import { getTournamentsForSport } from "@/lib/data/demo-competition";
import { sportToDbId, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

/**
 * Shared competition switcher. Every sport surface (matches, table, stats,
 * clubs, competition) uses this so multiple competitions scale everywhere.
 * Renders nothing when a sport has fewer than two competitions.
 */
export function CompetitionTabs({
  sport,
  basePath,
  activeId,
}: {
  sport: SportId;
  basePath: string;
  /** Currently selected competition id; defaults to the first competition */
  activeId?: string;
}) {
  const competitions = getTournamentsForSport(sportToDbId(sport));
  if (competitions.length < 2) return null;

  const resolvedActive = activeId ?? competitions[0].id;

  return (
    <nav className="border-b border-rule bg-wrapper">
      <div className="mx-auto flex max-w-[1200px] gap-6 overflow-x-auto px-4 sm:px-6">
        {competitions.map((c) => (
          <Link
            key={c.id}
            href={`${basePath}?sport=${sport}&competition=${c.id}`}
            className={cn(
              "shrink-0 py-3 font-display text-sm font-semibold",
              c.id === resolvedActive && "border-b-2 border-accent"
            )}
          >
            {c.name}
            <span className="ml-1.5 text-[10px] font-bold uppercase opacity-40">
              {c.competition_type === "cup" ? "Cup" : "League"}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
