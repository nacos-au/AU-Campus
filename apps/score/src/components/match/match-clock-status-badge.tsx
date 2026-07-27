"use client";

import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Read-only clock state for public match views (keeper controls the clock). */
export function MatchClockStatusBadge({
  isRunning,
  isTimeLost,
  clockOnLabel = "Playing",
  clockOffLabel = "Time lost",
  className,
}: {
  isRunning: boolean;
  isTimeLost: boolean;
  clockOnLabel?: string;
  clockOffLabel?: string;
  className?: string;
}) {
  const playing = isRunning && !isTimeLost;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-bold",
        playing ? "bg-emerald-500/20 text-emerald-100" : "bg-white/15 text-white/80",
        className
      )}
    >
      {playing ? (
        <>
          <Play className="h-3 w-3" />
          {clockOnLabel}
        </>
      ) : (
        <>
          <Pause className="h-3 w-3" />
          {isTimeLost ? clockOffLabel : "Stopped"}
        </>
      )}
    </span>
  );
}
