"use client";

import type { SquadPlayer } from "@/lib/data/demo-squads";
import type { KeeperTeamQuickAction } from "@/lib/keeper/keeper-sport-config";
import type { Match } from "@/lib/types/database";
import { TeamCrest, PlayerAvatar } from "@/components/ui/team-crest";
import { PlayerName } from "@/components/ui/player-name";
import { splitSquad, type SubPair } from "@/lib/keeper/squad-state";
import { cn } from "@/lib/utils/cn";
import { ArrowLeftRight } from "lucide-react";

export function KeeperRosterColumn({
  team,
  players,
  selectedPlayerId,
  onSelectPlayer,
  teamQuickActions,
  onTeamQuickAction,
  title,
  laneHeader,
  /** When set, split XI / bench and highlight the pick target for substitutions. */
  subMode,
  appliedSubs,
  onQuickSub,
  subsLeft,
}: {
  team?: Match["home_team"];
  players: SquadPlayer[];
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  teamQuickActions?: KeeperTeamQuickAction[];
  onTeamQuickAction?: (action: KeeperTeamQuickAction) => void;
  title?: string;
  laneHeader?: boolean;
  subMode?: "pick_out" | "pick_in" | null;
  /** Substitutions already logged for this side. Moves players between XI, bench and off. */
  appliedSubs?: SubPair[];
  /** Tap the swap icon on an XI player to start a substitution for them. */
  onQuickSub?: (playerId: string) => void;
  /** Substitutions still allowed in this match. */
  subsLeft?: number;
}) {
  const code = team?.department?.short_code ?? "AU";
  const displayName = title ?? team?.name ?? "Squad";
  const institution = team?.institution ?? null;

  const { xi, bench: subs, subbedOff } = splitSquad(players, appliedSubs ?? []);

  const renderPlayer = (p: SquadPlayer, idx: number, section: "xi" | "bench" | "off") => {
    const selected = selectedPlayerId === p.id;
    const off = section === "off";
    const dimForSub =
      off ||
      (subMode === "pick_in"
        ? section === "xi"
        : subMode === "pick_out"
          ? section === "bench"
          : false);
    const canQuickSub = Boolean(onQuickSub) && section === "xi" && !subMode && (subsLeft ?? 1) > 0;
    return (
      <li key={`${p.id}-${p.jersey_number ?? idx}`} className="flex items-stretch">
        <button
          type="button"
          onClick={() => onSelectPlayer(p.id)}
          disabled={off}
          className={cn(
            "interactive-row flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left transition-colors",
            selected && "bg-accent/10 ring-2 ring-inset ring-accent/40",
            dimForSub && "opacity-40",
            subMode === "pick_in" && section === "bench" && "bg-emerald-50/50",
            subMode === "pick_out" && section === "xi" && "bg-amber-50/40"
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
            <PlayerName player={p} className="block truncate font-display text-sm font-bold" />
            <span className="text-[10px] font-semibold uppercase text-accent/45">
              {off ? "Subbed off" : section === "bench" ? "Bench" : p.position || p.squad_role || "XI"}
              {selected ? " · tap to close" : ""}
            </span>
          </span>
        </button>
        {canQuickSub && (
          <button
            type="button"
            onClick={() => onQuickSub?.(p.id)}
            aria-label="Substitute this player"
            title="Substitute this player"
            className="interactive-btn flex w-10 shrink-0 items-center justify-center text-accent/60 hover:text-accent"
          >
            <ArrowLeftRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-rule bg-white">
      <div className="space-y-2 border-b border-rule px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          {team && <TeamCrest code={code} logoUrl={team.logo_url} alt={displayName} size="md" />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-extrabold leading-tight">{displayName}</p>
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-accent/50">
              {institution?.trim() || code}
            </p>
          </div>
        </div>
        {teamQuickActions && teamQuickActions.length > 0 && onTeamQuickAction && !subMode && (
          <div className="flex flex-wrap gap-1.5">
            {teamQuickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onTeamQuickAction(action)}
                className="interactive-btn inline-flex min-h-8 items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[11px] font-bold uppercase"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
        {subMode && (
          <p className="rounded-md bg-accent/5 px-2 py-1.5 text-[11px] font-semibold text-accent">
            {subMode === "pick_in"
              ? "Tap a bench player coming on"
              : "Tap a player going off (or confirm above)"}
          </p>
        )}
      </div>
      <ul className="max-h-[360px] overflow-y-auto">
        <li className="sticky top-0 z-10 border-b border-rule bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-accent/50">
          On the pitch
        </li>
        {xi.map((p, idx) => renderPlayer(p, idx, "xi"))}
        {subs.length > 0 && (
          <>
            <li className="sticky top-0 z-10 border-y border-rule bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-accent/50">
              Substitutes
            </li>
            {subs.map((p, idx) => renderPlayer(p, idx, "bench"))}
          </>
        )}
        {subbedOff.length > 0 && (
          <>
            <li className="sticky top-0 z-10 border-y border-rule bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-accent/50">
              Subbed off
            </li>
            {subbedOff.map((p, idx) => renderPlayer(p, idx, "off"))}
          </>
        )}
      </ul>
    </div>
  );
}
