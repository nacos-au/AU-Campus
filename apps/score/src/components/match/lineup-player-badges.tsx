import { GiSoccerBall } from "react-icons/gi";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { FootballCleatIcon } from "@/components/match/match-event-icons";
import { cn } from "@/lib/utils/cn";
import type { LineupPlayerEvents } from "@/lib/match/lineup-player-events";

function BadgeShell({
  className,
  count,
  children,
}: {
  className?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-sm", className)}>
      {children}
      {count != null && count > 1 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[8px] font-bold leading-none text-white">
          {count}
        </span>
      )}
    </span>
  );
}

export function LineupPlayerBadges({
  badges,
  showMotm,
}: {
  badges: LineupPlayerEvents;
  showMotm: boolean;
}) {
  const showSub = badges.substitutedOn || badges.substitutedOff;

  return (
    <>
      {(badges.yellowCard || badges.redCard) && (
        <BadgeShell className="absolute -left-2 -top-1 z-10">
          <span
            className={cn(
              "block h-3 w-2 rounded-[2px]",
              badges.redCard ? "bg-red-600" : "bg-yellow-400"
            )}
          />
        </BadgeShell>
      )}

      {showSub && (
        <BadgeShell className="absolute -left-2 top-1/2 z-10 -translate-y-1/2">
          <span className="flex flex-col items-center leading-none">
            <ArrowRight className="h-2 w-2 text-neutral-400" strokeWidth={3} />
            <ArrowLeft className="-mt-0.5 h-2 w-2 text-red-600" strokeWidth={3} />
          </span>
        </BadgeShell>
      )}

      {badges.goals > 0 && (
        <BadgeShell className="absolute -right-2 -top-1 z-10" count={badges.goals}>
          <GiSoccerBall className="h-2.5 w-2.5 text-neutral-800" />
        </BadgeShell>
      )}

      {badges.assists > 0 && (
        <BadgeShell className="absolute -right-2 top-1/2 z-10 -translate-y-1/2" count={badges.assists}>
          <FootballCleatIcon className="h-3 w-3 text-neutral-800" />
        </BadgeShell>
      )}

      {showMotm && badges.isMotm && (
        <span className="absolute -bottom-2 left-1/2 z-10 flex h-[18px] w-[18px] -translate-x-1/2 items-center justify-center rounded-full bg-[#2563eb] shadow-sm">
          <Star className="h-2.5 w-2.5 fill-white text-white" />
        </span>
      )}
    </>
  );
}
