"use client";

import { Flag, Play } from "lucide-react";
import { MatchCountdown } from "@/components/match/match-countdown";
import type { LifecycleStatus } from "@/lib/match/use-match-lifecycle";
import { cn } from "@/lib/utils/cn";

export function MatchLifecycleControls({
  status,
  scheduledAt,
  onStart,
  onEnd,
  className,
  /** When false, hide the live End match button (moved into settings). */
  showEnd = true,
}: {
  status: LifecycleStatus;
  scheduledAt: string | null | undefined;
  onStart: () => void;
  onEnd: () => void;
  className?: string;
  showEnd?: boolean;
}) {
  if (status === "completed") {
    return (
      <p className={cn("text-center text-sm font-semibold text-emerald-700", className)}>
        Match ended
      </p>
    );
  }

  if (status === "scheduled") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <MatchCountdown scheduledAt={scheduledAt} status={status} />
        <button
          type="button"
          onClick={onStart}
          className="btn-filled inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-display text-sm font-bold"
        >
          <Play className="h-4 w-4" />
          Start match
        </button>
        <p className="max-w-xs text-center text-xs opacity-60">
          Starts the clock at 0:00 and marks the fixture live for all viewers.
        </p>
      </div>
    );
  }

  if (!showEnd) {
    return (
      <p
        className={cn(
          "inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wide text-red-700",
          className
        )}
      >
        Live
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onEnd}
      className={cn(
        "interactive-btn inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-display text-sm font-bold text-red-800",
        className
      )}
    >
      <Flag className="h-4 w-4" />
      End match
    </button>
  );
}
