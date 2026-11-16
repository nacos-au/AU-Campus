"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  formatKickoffTime24,
  getKickoffCountdown,
} from "@/lib/match/match-countdown";
import { matchPeriodStatusLabel } from "@/lib/match/match-period-labels";
import type { LifecycleStatus } from "@/lib/match/use-match-lifecycle";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

export function MatchStatusPill({
  status,
  scheduledAt,
  currentPeriod,
  sport,
  liveTime,
  className,
}: {
  status: LifecycleStatus;
  scheduledAt: string | null | undefined;
  currentPeriod: string;
  sport: SportId;
  /** Formatted match clock e.g. 41:28 — shown when live in normal play */
  liveTime?: string;
  className?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (status !== "scheduled") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  void tick;

  const pillClass = cn(
    "inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-bold tabular-nums",
    className
  );

  if (status === "completed" || currentPeriod === "full_time") {
    return <span className={pillClass}>Full time</span>;
  }

  if (status === "live") {
    const periodLabel = matchPeriodStatusLabel(currentPeriod, sport);
    const breakPeriod =
      currentPeriod === "half_time" ||
      currentPeriod === "halftime" ||
      currentPeriod === "extra_time" ||
      currentPeriod === "penalty_shootout";

    if (breakPeriod && periodLabel) {
      return <span className={pillClass}>{periodLabel}</span>;
    }

    if (liveTime && periodLabel && sport !== "football") {
      return (
        <span className={pillClass}>
          {periodLabel} · {liveTime}
        </span>
      );
    }

    if (liveTime) {
      return <span className={pillClass}>{liveTime}</span>;
    }

    if (periodLabel) {
      return <span className={pillClass}>{periodLabel}</span>;
    }

    return <span className={pillClass}>Live</span>;
  }

  if (!scheduledAt) {
    return <span className={pillClass}>Scheduled</span>;
  }

  const state = getKickoffCountdown(scheduledAt);
  if (!state || state.phase === "far") {
    return <span className={pillClass}>{formatKickoffTime24(scheduledAt)}</span>;
  }

  if (state.phase === "countdown" || state.phase === "awaiting") {
    return (
      <span className={cn(pillClass, "text-red-300")}>
        {formatCountdown(Math.max(0, state.msUntil))}
      </span>
    );
  }

  return <span className={pillClass}>{formatKickoffTime24(scheduledAt)}</span>;
}
