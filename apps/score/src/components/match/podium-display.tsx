import Link from "next/link";
import type { PodiumSet } from "@/lib/match/podium";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { cn } from "@/lib/utils/cn";

const HEIGHT = { 1: "h-28", 2: "h-20", 3: "h-16" } as const;
const ORDER = [2, 1, 3] as const;

export function PodiumDisplay({ podium, sport }: { podium: PodiumSet; sport: string }) {
  if (podium.entries.length === 0) return null;

  const byRank = new Map(podium.entries.map((e) => [e.rank, e]));

  return (
    <section className="table-card p-5 sm:p-6">
      <h2 className="mb-5 text-center font-display text-sm font-extrabold uppercase tracking-wide opacity-60">
        {podium.title}
      </h2>
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {ORDER.filter((r) => byRank.has(r)).map((rank) => {
          const entry = byRank.get(rank)!;
          const [first, ...rest] = entry.label.split(" ");
          const href = entry.player_id
            ? `/players/${entry.player_id}?sport=${sport}`
            : entry.team_id
              ? `/teams/${entry.team_id}?sport=${sport}`
              : undefined;

          const inner = (
            <div className="flex flex-col items-center text-center">
              <div className="mb-2">
                {entry.player_id ? (
                  <PlayerAvatar firstName={first} lastName={rest.join(" ")} avatarUrl={entry.avatar_url} />
                ) : (
                  <TeamCrest code={entry.subtitle?.slice(0, 3) ?? "AU"} alt={entry.label} size="md" />
                )}
              </div>
              <div
                className={cn(
                  "flex w-20 sm:w-24 flex-col items-center justify-end rounded-t-lg bg-accent/10 px-2 pb-2 pt-3",
                  HEIGHT[rank as 1 | 2 | 3]
                )}
              >
                <span className="font-display text-lg font-extrabold text-accent">{rank}</span>
                <p className="mt-1 line-clamp-2 font-display text-xs font-bold leading-tight">{entry.label}</p>
                <p className="mt-0.5 text-[10px] font-semibold tabular-nums opacity-70">{entry.value}</p>
              </div>
            </div>
          );

          return href ? (
            <Link key={rank} href={href} className="hover:opacity-90">
              {inner}
            </Link>
          ) : (
            <div key={rank}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
