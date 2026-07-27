"use client";

import type { Match, SetScore } from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { TeamCrest } from "@/components/ui/team-crest";
import { scoreClass } from "@/lib/match/score-highlight";
import { cn } from "@/lib/utils/cn";

export function TennisMatchPanel({
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
  const isDoubles = match.match_variant === "doubles";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="branded-hero rounded-xl px-4 py-6 text-white sm:px-8 sm:py-8">
        {isDoubles && (
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide opacity-70">Doubles</p>
        )}
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          <TeamBlock name={match.home_team?.name ?? "Home"} code={homeCode} logo={match.home_team?.logo_url} align="left" />
          <div className="shrink-0 text-center">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              {isLive && currentSet
                ? `Set ${currentSet.set_number}: ${currentSet.home_games}–${currentSet.away_games}`
                : "Match"}
            </span>
            <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
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
        <div className="mt-4 overflow-hidden rounded-xl border border-rule bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule bg-surface text-xs font-bold uppercase opacity-60">
                <th className="px-4 py-2 text-left">Set</th>
                <th className="px-4 py-2 text-center">{homeCode}</th>
                <th className="px-4 py-2 text-center">{awayCode}</th>
              </tr>
            </thead>
            <tbody>
              {setScores.map((s) => (
                <tr
                  key={s.set_number}
                  className={cn(
                    "border-b border-rule last:border-0",
                    s.set_number === setScores.length && isLive && "bg-accent/5"
                  )}
                >
                  <td className="px-4 py-3 font-display font-semibold">
                    Set {s.set_number}
                    {s.tiebreak && <span className="ml-1 text-xs opacity-50">TB</span>}
                  </td>
                  <td className="px-4 py-3 text-center font-display font-extrabold tabular-nums">{s.home_games}</td>
                  <td className="px-4 py-3 text-center font-display font-extrabold tabular-nums">{s.away_games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4 rounded-xl border border-rule bg-[#1a1a1a] px-4 py-4 text-white">
          <p className="mb-2 text-xs font-bold uppercase opacity-40">Key moments</p>
          <ul className="space-y-2 text-sm">
            {events.slice(0, 4).map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span className="capitalize opacity-80">{e.event_type.replace(/_/g, " ")}</span>
                <span className="shrink-0 opacity-50">{e.match_time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
