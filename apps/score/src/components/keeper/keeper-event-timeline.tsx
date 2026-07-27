"use client";

import { X } from "lucide-react";
import type { KeeperLogEntry } from "@/lib/keeper/keeper-events";
import { entryLabel } from "@/lib/keeper/keeper-events";
import { TeamCrest } from "@/components/ui/team-crest";
import { formatEventLabel } from "@/lib/match/timeline";
import { cn } from "@/lib/utils/cn";

export function KeeperEventTimeline({
  logs,
  onRemove,
}: {
  logs: KeeperLogEntry[];
  onRemove: (id: string) => void;
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-rule bg-surface/50 px-4 py-6 text-center text-sm opacity-50">
        No events logged yet — tap a player, then an action.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-rule rounded-lg border border-rule bg-white">
      {logs.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <span className="w-10 shrink-0 font-mono text-xs font-bold tabular-nums opacity-50">
            {entry.match_time}
          </span>
          <TeamCrest code={entry.team_code} logoUrl={entry.team_logo_url} alt={entry.team_name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold">{entryLabel(entry)}</p>
            <p className="text-xs opacity-50">{formatEventLabel(entry.event_type)}</p>
          </div>
          <EventBadge type={entry.event_type} />
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="interactive-btn shrink-0 rounded-full p-1.5 text-red-600 hover:bg-red-50"
            aria-label={`Remove ${entryLabel(entry)}`}
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    goal: "bg-[#004e28]/10 text-[#004e28]",
    penalty_scored: "bg-[#004e28]/10 text-[#004e28]",
    penalty_missed: "bg-red-100 text-red-700",
    yellow_card: "bg-yellow-100 text-yellow-800",
    red_card: "bg-red-100 text-red-800",
    warning: "bg-amber-100 text-amber-800",
    offside: "bg-surface text-accent",
    corner: "bg-surface text-accent",
    save: "bg-blue-50 text-blue-800",
    substitution: "bg-surface text-accent",
    two_pointer: "bg-[#004e28]/10 text-[#004e28]",
    field_goal: "bg-[#004e28]/10 text-[#004e28]",
    free_throw: "bg-surface text-accent",
    foul_personal: "bg-yellow-100 text-yellow-800",
    foul_technical: "bg-red-100 text-red-800",
    timeout: "bg-surface text-accent",
    point_won: "bg-[#004e28]/10 text-[#004e28]",
    free_throw_missed: "bg-red-100 text-red-700",
    winner: "bg-accent/10 text-accent",
    kill: "bg-[#004e28]/10 text-[#004e28]",
    block: "bg-blue-50 text-blue-800",
    ace: "bg-[#004e28]/10 text-[#004e28]",
    error: "bg-red-100 text-red-700",
    set_won: "bg-accent/10 text-accent",
    game_won: "bg-accent/10 text-accent",
    break_point_won: "bg-accent/10 text-accent",
    fault: "bg-amber-100 text-amber-800",
    double_fault: "bg-red-100 text-red-700",
    finish: "bg-[#004e28]/10 text-[#004e28]",
    dnf: "bg-red-100 text-red-700",
    false_start: "bg-amber-100 text-amber-800",
  };

  return (
    <span
      className={cn(
        "hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase sm:inline",
        styles[type] ?? "bg-surface"
      )}
    >
      {formatEventLabel(type)}
    </span>
  );
}
