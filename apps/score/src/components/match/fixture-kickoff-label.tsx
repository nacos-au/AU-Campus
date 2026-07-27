"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  formatKickoffTime24,
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
      <span className="font-mono text-xs font-bold tabular-nums opacity-70">
        {formatKickoffTime24(scheduledAt)}
      </span>
    );
  }

  return (
    <span className={cn("font-mono text-xs font-bold tabular-nums text-accent")}>
      {formatCountdown(Math.max(0, state.msUntil))}
    </span>
  );
}
