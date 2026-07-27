"use client";

import { MatchCountdown } from "@/components/match/match-countdown";
import { formatKickoffTime } from "@/lib/match/match-countdown";

export function FixtureKickoffLabel({
  scheduledAt,
  status,
}: {
  scheduledAt: string | null | undefined;
  status: string;
}) {
  if (status !== "scheduled" || !scheduledAt) return null;

  return (
    <div className="text-right">
      <MatchCountdown scheduledAt={scheduledAt} status="scheduled" compact className="text-xs" />
      <p className="mt-1 text-[10px] opacity-40">{formatKickoffTime(scheduledAt)}</p>
    </div>
  );
}
