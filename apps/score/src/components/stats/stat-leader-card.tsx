import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/team-crest";
import type { Player } from "@/lib/types/database";

import type { SportId } from "@/lib/utils/sport";

export interface StatLeader {
  player: Player;
  teamName: string;
  teamCode: string;
  value: number;
}

export function StatLeaderCard({
  title,
  leaders,
  href,
  sport = "football",
  formatValue,
}: {
  title: string;
  leaders: StatLeader[];
  href?: string;
  sport?: SportId;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="h-full rounded-xl border border-rule bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <h3 className="font-display text-sm font-extrabold">{title}</h3>
        {href && (
          <Link href={href}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <ul>
        {leaders.map((leader, index) => (
          <li
            key={leader.player.id}
            className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0 hover:bg-wrapper"
          >
            <span className="w-4 font-display text-sm font-bold opacity-40">{index + 1}</span>
            <PlayerAvatar
              firstName={leader.player.first_name}
              lastName={leader.player.last_name}
              avatarUrl={leader.player.avatar_url}
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/players/${leader.player.id}?sport=${sport}`}
                className="block truncate font-display text-sm font-bold hover:underline"
              >
                {leader.player.first_name} {leader.player.last_name}
              </Link>
              <p className="truncate text-xs font-medium opacity-60">{leader.teamName}</p>
            </div>
            <span className="font-display text-xl font-extrabold tabular-nums">
              {formatValue ? formatValue(leader.value) : leader.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlayerStatRow({
  rank,
  player,
  teamName,
  teamCode,
  value,
  sport = "football",
  formatValue,
}: {
  rank: number;
  player: Player;
  teamName: string;
  teamCode: string;
  value: number;
  statLabel: string;
  sport?: SportId;
  formatValue?: (value: number) => string;
}) {
  return (
    <Link
      href={`/players/${player.id}?sport=${sport}`}
      className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-rule bg-white px-5 py-4 hover:bg-wrapper sm:grid-cols-[3rem_1fr_auto] sm:gap-4"
    >
      <span className="font-display text-xl font-extrabold opacity-30 sm:text-2xl">{rank}</span>
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <PlayerAvatar
          firstName={player.first_name}
          lastName={player.last_name}
          avatarUrl={player.avatar_url}
        />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold sm:text-base">
            {player.first_name} {player.last_name}
          </p>
          <p className="truncate text-xs font-medium opacity-60">
            {teamCode} · {teamName}
            {player.position ? ` · ${player.position}` : ""}
          </p>
        </div>
      </div>
      <span className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">
        {formatValue ? formatValue(value) : value}
      </span>
    </Link>
  );
}
