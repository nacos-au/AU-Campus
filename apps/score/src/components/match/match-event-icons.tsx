import { GiSoccerBall, GiSoccerKick } from "react-icons/gi";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function GoalBallIcon({ className }: { className?: string }) {
  return <GiSoccerBall className={cn("shrink-0", className)} aria-hidden />;
}

export function PenaltyGoalIcon({ className }: { className?: string }) {
  return <GiSoccerKick className={cn("shrink-0", className)} aria-hidden />;
}

export function SubstitutionIcon({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 flex-col", className)} aria-hidden>
      <ArrowDownLeft className="h-2.5 w-2.5 text-red-600" strokeWidth={2.5} />
      <ArrowUpRight className="-mt-1 h-2.5 w-2.5 text-green-600" strokeWidth={2.5} />
    </span>
  );
}

export function YellowCardIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] bg-yellow-400", className)}
      aria-hidden
    />
  );
}

export function RedCardIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] bg-red-600", className)}
      aria-hidden
    />
  );
}

export function AssistIcon({ className }: { className?: string }) {
  return <FootballCleatIcon className={className} />;
}

/** Side-view football cleat — FotMob-style assist marker. */
export function FootballCleatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("shrink-0", className)} aria-hidden>
      <path
        d="M2.5 10.2 5.2 4.8c.2-.4.6-.6 1-.6h3.6c.4 0 .8.2 1 .5l1.8 3.2c.2.3.2.7 0 1l-1.2 2.2c-.2.4-.6.6-1 .6H5.8c-.5 0-1-.3-1.2-.7l-1.1-1.8Z"
        fill="currentColor"
      />
      <circle cx="5.8" cy="11.2" r="0.65" fill="white" />
      <circle cx="8.2" cy="11.4" r="0.65" fill="white" />
      <circle cx="10.4" cy="10.8" r="0.65" fill="white" />
    </svg>
  );
}
