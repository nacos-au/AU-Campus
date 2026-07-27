"use client";

import { LiveBadge } from "@/components/layout/site-header";
import { MatchCountdown } from "@/components/match/match-countdown";
import { useMatchLifecycle } from "@/lib/match/use-match-lifecycle";

export function MatchLifecycleBadge({
  matchId,
  initialStatus,
  scheduledAt,
}: {
  matchId: string;
  initialStatus: "scheduled" | "live" | "completed";
  scheduledAt: string | null | undefined;
}) {
  const { isLive, isScheduled, status } = useMatchLifecycle(matchId, {
    status: initialStatus,
    scheduledAt,
  });

  if (isLive) {
    return <LiveBadge />;
  }

  if (isScheduled) {
    return <MatchCountdown scheduledAt={scheduledAt} status={status} compact />;
  }

  return null;
}
