"use client";

import { eventsToMarkers, markerColor } from "@/lib/match/timeline";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

interface MatchTimeBarProps {
  sport: SportId;
  events: DemoMatchEvent[];
  elapsedMinutes?: number;
  totalMinutes?: number;
  period?: string;
  isLive?: boolean;
  halves?: boolean;
}

export function MatchTimeBar({
  sport,
  events,
  elapsedMinutes = 41,
  totalMinutes = 90,
  period = "half_1",
  isLive = true,
  halves = true,
}: MatchTimeBarProps) {
  const markers = eventsToMarkers(events, sport);
  const progress = Math.min(100, (elapsedMinutes / totalMinutes) * 100);
  const inSecondHalf = period.includes("half_2") || period.includes("extra") || elapsedMinutes > 45;
  const inExtraTime = period.includes("extra") || elapsedMinutes > 90;

  if (sport !== "football") {
    return (
      <div className="mx-auto w-full max-w-xl">
        <div className="relative h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-500"
            style={{ width: `${isLive ? 65 : 100}%` }}
          />
        </div>
        {isLive && <p className="mt-2 text-center font-mono text-sm font-bold tabular-nums">{period}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-2">
      <div className="relative pt-4 pb-1">
        <div className="relative flex h-3 overflow-hidden rounded-full bg-surface">
          {halves && <div className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-1/2 bg-rule" aria-hidden />}
          {totalMinutes > 90 && (
            <div
              className="absolute top-0 h-full w-px bg-accent/30"
              style={{ left: `${(90 / totalMinutes) * 100}%` }}
              aria-hidden
            />
          )}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
              isLive ? "bg-accent/80" : "bg-accent"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {markers.map((m) => {
          const left = Math.min(98, Math.max(1, (m.minute / totalMinutes) * 100));
          return (
            <div
              key={m.id}
              className="absolute top-2 z-20 -translate-x-1/2"
              style={{ left: `${left}%` }}
              title={`${m.minute}' · ${m.label} (${m.teamCode})`}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[8px] font-extrabold text-white shadow-sm"
                style={{ backgroundColor: markerColor(m.type) }}
              >
                {m.type.includes("card") ? (m.type.includes("yellow") ? "Y" : "R") : m.type.includes("penalty") ? "P" : "●"}
              </span>
            </div>
          );
        })}

        {isLive && (
          <div
            className="absolute top-1 z-30 h-5 w-0.5 rounded-full bg-accent shadow"
            style={{ left: `${progress}%` }}
          >
            <span className="absolute -top-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent ring-2 ring-white" />
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between font-mono text-xs font-semibold tabular-nums opacity-60">
        <span>0&apos;</span>
        <span className={inSecondHalf ? "text-accent" : ""}>45&apos;</span>
        {totalMinutes > 90 && <span className={inExtraTime ? "text-accent" : ""}>90&apos;</span>}
        <span>{totalMinutes}&apos;</span>
      </div>
      {isLive && (
        <p className="mt-1 text-center font-mono text-lg font-bold tabular-nums">
          {elapsedMinutes}&apos;
          <span className="ml-2 text-xs font-semibold uppercase opacity-50">
            {inExtraTime ? "Extra time" : inSecondHalf ? "2nd half" : "1st half"}
          </span>
        </p>
      )}
    </div>
  );
}
