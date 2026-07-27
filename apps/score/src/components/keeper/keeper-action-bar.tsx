"use client";

import { X } from "lucide-react";
import type { KeeperFoulChip, KeeperActionDef } from "@/lib/keeper/keeper-sport-config";
import { cn } from "@/lib/utils/cn";

export function KeeperActionBar({
  playerName,
  teamName,
  actions,
  foulChips,
  foulSectionLabel,
  pendingFoul,
  onAction,
  onFoulChip,
  onDismiss,
}: {
  playerName: string;
  teamName: string;
  actions: KeeperActionDef[];
  foulChips: KeeperFoulChip[];
  foulSectionLabel: string;
  pendingFoul: string | null;
  onAction: (type: string) => void;
  onFoulChip: (type: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="interactive-row min-w-0 flex-1 rounded-lg px-2 py-1 text-left"
        >
          <p className="truncate font-display text-sm font-bold">
            <span className="text-accent">{teamName}</span>
            <span className="opacity-40"> · </span>
            {playerName}
          </p>
          <p className="text-[10px] font-semibold uppercase opacity-40">Tap player or here to close</p>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="interactive-btn shrink-0 rounded-full p-1.5"
          aria-label="Close actions"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(actions.length, 6)}, minmax(0, 1fr))` }}
      >
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAction(a.id)}
            className="interactive-btn flex flex-col items-center gap-1 rounded-lg border border-rule bg-white py-2.5 font-display text-[10px] font-bold sm:text-xs"
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      {foulChips.length > 0 && (
        <div className="mt-3 border-t border-rule pt-3">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide opacity-50">
            {foulSectionLabel || "Card / warning"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {foulChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onFoulChip(chip.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 font-display text-xs font-extrabold transition-transform active:scale-95",
                  chip.className,
                  pendingFoul === chip.id && "ring-2 ring-offset-1 ring-accent"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
