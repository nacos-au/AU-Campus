"use client";

import type { SquadPlayer } from "@/lib/data/demo-squads";
import type { KeeperTeamQuickAction } from "@/lib/keeper/keeper-sport-config";
import type { Match } from "@/lib/types/database";
import { TeamCrest, PlayerAvatar } from "@/components/ui/team-crest";
import { cn } from "@/lib/utils/cn";

function isStarterRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return (
    r.includes("start") ||
    r.includes("xi") ||
    r === "gk" ||
    r === "df" ||
    r === "mf" ||
    r === "fw"
  );
}

function isBenchRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes("sub") || r.includes("bench") || r.includes("reserve");
}

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
}) {
  const code = team?.department?.short_code ?? "AU";
  const displayName = title ?? team?.name ?? "Squad";
  const institution = team?.institution ?? null;

  const sorted = [...players].sort((a, b) => {
    const ja = a.jersey_number ?? 999;
    const jb = b.jersey_number ?? 999;
    if (ja !== jb) return ja - jb;
    return a.last_name.localeCompare(b.last_name);
  });

  const hasRoles = sorted.some(
    (p) => isStarterRole(p.squad_role) || isBenchRole(p.squad_role)
  );
  const starters = hasRoles
    ? sorted.filter((p) => isStarterRole(p.squad_role) || !isBenchRole(p.squad_role))
    : sorted.slice(0, Math.min(11, sorted.length));
  const bench = hasRoles
    ? sorted.filter((p) => isBenchRole(p.squad_role))
    : sorted.slice(11);

  // If roles didn't produce a bench, fall back to jersey split so sub "in" has options.
  const xi = bench.length || hasRoles ? starters : sorted.slice(0, 11);
  const subs = bench.length || hasRoles ? bench : sorted.slice(11);

  const renderPlayer = (p: SquadPlayer, idx: number, section: "xi" | "bench") => {
    const selected = selectedPlayerId === p.id;
    const dimForSub =
      subMode === "pick_in"
        ? section === "xi"
        : subMode === "pick_out"
          ? section === "bench"
          : false;
    return (
      <li key={`${p.id}-${p.jersey_number ?? idx}`}>
        <button
          type="button"
          onClick={() => onSelectPlayer(p.id)}
          className={cn(
            "interactive-row flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
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
            <span className="block truncate font-display text-sm font-bold">
              {p.first_name} {p.last_name}
            </span>
            <span className="text-[10px] font-semibold uppercase text-accent/45">
              {section === "bench" ? "Bench" : p.position || p.squad_role || "XI"}
              {selected ? " · tap to close" : ""}
            </span>
          </span>
        </button>
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
          Starting XI
        </li>
        {xi.map((p, idx) => renderPlayer(p, idx, "xi"))}
        {subs.length > 0 && (
          <>
            <li className="sticky top-0 z-10 border-y border-rule bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-accent/50">
              Bench
            </li>
            {subs.map((p, idx) => renderPlayer(p, idx, "bench"))}
          </>
        )}
      </ul>
    </div>
  );
}
