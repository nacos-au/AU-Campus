"use client";

import { useEffect, useState } from "react";
import {
  formatKickoffLabel,
  formatNegativeCountdown,
  getKickoffCountdown,
} from "@/lib/match/match-countdown";
import { cn } from "@/lib/utils/cn";

export function FixtureKickoffLabel({
  scheduledAt,
  status,
}: {
  scheduledAt: string | null | undefined;
  status: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (status !== "scheduled") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  void tick;

  if (status !== "scheduled" || !scheduledAt) return null;

  const state = getKickoffCountdown(scheduledAt);
  if (!state || state.phase === "far") {
    return (
      <span className="font-display text-xs font-bold tabular-nums opacity-70">
        {formatKickoffLabel(scheduledAt)}
      </span>
    );
  }

  if (state.phase === "awaiting") {
    return (
      <span className={cn("font-mono text-xs font-bold tabular-nums text-accent")}>0:00</span>
    );
  }

  return (
    <span className={cn("font-mono text-xs font-bold tabular-nums text-accent")}>
      {formatNegativeCountdown(state.msUntil)}
    </span>
  );
}
