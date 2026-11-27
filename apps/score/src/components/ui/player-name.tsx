"use client";

import { ArrowLeftRight } from "lucide-react";
import { playerDisplayName, type NameParts } from "@/lib/players/display-name";
import { useNameMode } from "@/lib/players/use-name-mode";
import { cn } from "@/lib/utils/cn";

/** Renders a player's name in the viewer's chosen mode (legal or nickname). */
export function PlayerName({
  player,
  short = false,
  className,
}: {
  player: NameParts;
  short?: boolean;
  className?: string;
}) {
  const [mode] = useNameMode();
  return <span className={className}>{playerDisplayName(player, mode, { short })}</span>;
}

/** Small switch between legal name and nickname. Shown only when it matters. */
export function NameModeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [mode, toggle] = useNameMode();
  const label = mode === "legal" ? "Legal names" : "Nicknames";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={mode === "nickname"}
      title={
        mode === "legal"
          ? "Showing legal names. Tap to show nicknames."
          : "Showing nicknames. Tap to show legal names."
      }
      className={cn(
        "interactive-btn inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-accent",
        className
      )}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      {!compact && <span>{label}</span>}
    </button>
  );
}
