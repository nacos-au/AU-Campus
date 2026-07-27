"use client";

import { LiveBadge } from "@/components/layout/site-header";
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
  const { isLive } = useMatchLifecycle(matchId, {
    status: initialStatus,
    scheduledAt,
  });

  if (!isLive) return null;

  return <LiveBadge />;
}
