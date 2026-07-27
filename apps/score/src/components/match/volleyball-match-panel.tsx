"use client";

import type { Match, SetScore } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { TeamCrest } from "@/components/ui/team-crest";
import { scoreClass } from "@/lib/match/score-highlight";
import { cn } from "@/lib/utils/cn";

export function VolleyballMatchPanel({
  match,
  events,
  isLive,
  setScores,
}: {
  match: Match;
  events: DemoMatchEvent[];
  isLive: boolean;
  setScores: SetScore[];
}) {
  const homeCode = match.home_team?.department?.short_code ?? "H";
  const awayCode = match.away_team?.department?.short_code ?? "A";
  const currentSet = setScores[setScores.length - 1];
  const periodNum = match.current_period.replace("set_", "");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="branded-hero rounded-xl px-4 py-6 text-white sm:px-8 sm:py-8">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            Sets {match.home_score} – {match.away_score}
            {isLive && currentSet && (
              <span className="ml-2 opacity-80">
                · Set {periodNum}: {currentSet.home_games}–{currentSet.away_games}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          <TeamBlock name={match.home_team?.name ?? "Home"} code={homeCode} logo={match.home_team?.logo_url} align="left" />
          <div className="shrink-0 text-center">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <span className={cn("text-4xl sm:text-5xl", scoreClass(match.home_score, match.away_score, "home", "lg", "dark"))}>
                {match.home_score}
              </span>
              <span className="text-lg opacity-40">sets</span>
              <span className={cn("text-4xl sm:text-5xl", scoreClass(match.home_score, match.away_score, "away", "lg", "dark"))}>
                {match.away_score}
              </span>
            </div>
          </div>
          <TeamBlock name={match.away_team?.name ?? "Away"} code={awayCode} logo={match.away_team?.logo_url} align="right" />
        </div>
      </div>

      {setScores.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {setScores.map((s) => (
            <div
              key={s.set_number}
              className={cn(
                "rounded-lg border px-4 py-2 text-center",
                s.set_number === setScores.length && isLive
                  ? "border-accent bg-accent/5"
                  : "border-rule bg-white"
              )}
            >
              <p className="text-[10px] font-bold uppercase opacity-50">Set {s.set_number}</p>
              <p className="font-display text-sm font-extrabold tabular-nums">
                {s.home_games}–{s.away_games}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-rule bg-white px-4 py-4">
        <p className="mb-2 text-center text-xs font-bold uppercase opacity-40">Rally highlights</p>
        <div className="flex flex-wrap justify-center gap-2">
          {events.slice(0, 6).map((e) => (
            <span key={e.id} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold capitalize">
              {e.event_type.replace(/_/g, " ")}
            </span>
          ))}
          {events.length === 0 && <span className="text-xs opacity-50">No highlights yet</span>}
        </div>
      </div>
    </div>
  );
}

function TeamBlock({
  name,
  code,
  logo,
  align,
}: {
  name: string;
  code: string;
  logo?: string | null;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2 sm:gap-3", align === "right" && "flex-row-reverse text-right")}>
      <TeamCrest code={code} logoUrl={logo} alt={name} size="md" />
      <p className="hidden truncate font-display text-sm font-bold sm:block">{name}</p>
      <p className="truncate font-display text-xs font-bold sm:hidden">{code}</p>
    </div>
  );
}
