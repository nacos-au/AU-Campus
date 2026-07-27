"use client";

import type { SquadPlayer } from "@/lib/data/demo-squads";
import type { KeeperTeamQuickAction } from "@/lib/keeper/keeper-sport-config";
import type { Match } from "@/lib/types/database";
import { TeamCrest, PlayerAvatar } from "@/components/ui/team-crest";
import { cn } from "@/lib/utils/cn";

export function KeeperRosterColumn({
  team,
  players,
  selectedPlayerId,
  onSelectPlayer,
  teamQuickActions,
  onTeamQuickAction,
  title,
  laneHeader,
}: {
  team?: Match["home_team"];
  players: SquadPlayer[];
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  teamQuickActions?: KeeperTeamQuickAction[];
  onTeamQuickAction?: (action: KeeperTeamQuickAction) => void;
  title?: string;
  laneHeader?: boolean;
}) {
  const code = team?.department?.short_code ?? "AU";
  const displayName = title ?? team?.name ?? "Squad";

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-rule bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {team && <TeamCrest code={code} logoUrl={team.logo_url} alt={displayName} size="sm" />}
          <p className="truncate font-display text-xs font-extrabold sm:text-sm">{displayName}</p>
        </div>
        {teamQuickActions && teamQuickActions.length > 0 && onTeamQuickAction && (
          <div className="flex flex-wrap gap-1">
            {teamQuickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onTeamQuickAction(action)}
                className="interactive-btn flex shrink-0 items-center gap-1 rounded-md border border-rule px-2 py-1 text-[10px] font-bold uppercase"
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <ul className="max-h-[320px] overflow-y-auto divide-y divide-rule">
        {players.map((p, idx) => {
          const selected = selectedPlayerId === p.id;
          return (
            <li key={`${p.id}-${p.jersey_number ?? idx}`}>
              <button
                type="button"
                onClick={() => onSelectPlayer(p.id)}
                className={cn(
                  "interactive-row flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                  selected && "bg-accent/10 ring-2 ring-inset ring-accent/40"
                )}
              >
                <span className="w-8 shrink-0 font-display text-xs font-extrabold tabular-nums opacity-50">
                  {laneHeader
                    ? p.jersey_number != null
                      ? `L${p.jersey_number}`
                      : "—"
                    : (p.jersey_number ?? "—")}
                </span>
                <PlayerAvatar
                  firstName={p.first_name}
                  lastName={p.last_name}
                  avatarUrl={p.avatar_url}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold">
                    {p.first_name} {p.last_name}
                  </span>
                  {selected && (
                    <span className="text-[10px] font-semibold uppercase text-accent/60">Tap to close</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
