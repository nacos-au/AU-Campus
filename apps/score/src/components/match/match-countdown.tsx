"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  formatKickoffTime,
  getKickoffCountdown,
  type KickoffCountdownState,
} from "@/lib/match/match-countdown";
import type { LifecycleStatus } from "@/lib/match/use-match-lifecycle";
import { cn } from "@/lib/utils/cn";

export function MatchCountdown({
  scheduledAt,
  status,
  className,
  compact,
}: {
  scheduledAt: string | null | undefined;
  status: LifecycleStatus;
  className?: string;
  compact?: boolean;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (status === "completed" || status === "live" || !scheduledAt) return null;

  const state: KickoffCountdownState | null = getKickoffCountdown(scheduledAt);
  if (!state) return null;

  void tick;

  if (state.phase === "far") {
    return (
      <p className={cn("text-sm opacity-70", className)}>
        Kickoff {formatKickoffTime(state.scheduledAt)}
      </p>
    );
  }

  if (state.phase === "countdown") {
    return (
      <div
        className={cn(
          "inline-flex flex-col items-center rounded-xl border border-accent/30 bg-accent/5 px-4 py-2",
          compact && "px-3 py-1.5",
          className
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-accent">
          Starts in
        </span>
        <span className="font-mono text-xl font-bold tabular-nums text-accent sm:text-2xl">
          {formatCountdown(state.msUntil)}
        </span>
        <span className="text-xs opacity-60">{formatKickoffTime(state.scheduledAt)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-sm font-semibold text-accent",
        className
      )}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      Awaiting kickoff · {formatKickoffTime(state.scheduledAt)}
    </div>
  );
}
