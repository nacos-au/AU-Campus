import Link from "next/link";
import type { SportId } from "@/lib/utils/sport";
import { TeamCrest } from "@/components/ui/team-crest";
import { cn } from "@/lib/utils/cn";
import { formatEventType, type DemoMatchEvent } from "@/lib/data/demo-match-details";
import { displayMatchTime } from "@/lib/match/timeline";

function displayEventType(event: DemoMatchEvent): string {
  if (event.event_type === "penalty_scored") return "Penalty goal";
  if (event.event_type === "penalty_missed") return "Penalty missed";
  return formatEventType(event.event_type);
}

export function MatchEventsList({
  events,
  sport,
  title,
}: {
  events: DemoMatchEvent[];
  sport: SportId;
  title: string;
}) {
  return (
    <section>
      <h2 className="mb-4 font-display text-xl font-extrabold">{title}</h2>
      <div className="table-card divide-y divide-rule">
        {events.length === 0 ? (
          <p className="p-8 text-center opacity-70">No events yet</p>
        ) : (
          events.map((event) => {
            const matchTimeLabel = displayMatchTime(event.match_time, sport);
            const playerLabel = [event.player.first_name, event.player.last_name]
              .filter(Boolean)
              .join(" ")
              .trim();
            return (
            <div key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 hover:bg-wrapper">
              {matchTimeLabel ? (
                <span className="w-14 shrink-0 text-sm opacity-60">{matchTimeLabel}</span>
              ) : null}
              <TeamCrest
                code={event.team_code}
                logoUrl={event.team_logo_url}
                alt={event.team_name}
                size="sm"
              />
              {playerLabel ? (
                event.player.id ? (
                  <Link
                    href={`/players/${event.player.id}?sport=${sport}`}
                    className="font-display font-bold hover:underline"
                  >
                    {playerLabel}
                  </Link>
                ) : (
                  <span className="font-display font-bold">{playerLabel}</span>
                )
              ) : null}
              <span className="hidden text-xs font-semibold uppercase tracking-wide opacity-50 sm:inline">
                {event.team_name}
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold capitalize",
                event.event_type.includes("penalty_scored") && "bg-[#004e28]/10 text-[#004e28]",
                event.event_type.includes("penalty_missed") && "bg-red-50 text-red-700",
                !event.event_type.includes("penalty") && "opacity-70"
              )}>
                {displayEventType(event)}
              </span>
              {event.details?.points != null && (
                <span className="text-sm font-semibold opacity-70">+{String(event.details.points)} pts</span>
              )}
              {event.details?.rank != null && (
                <span className="text-sm font-semibold opacity-70">P{String(event.details.rank)}</span>
              )}
              {event.details?.assist_player_name != null && (
                <span className="text-xs opacity-60">assist: {String(event.details.assist_player_name)}</span>
              )}
            </div>
            );
          })
        )}
      </div>
    </section>
  );
}
