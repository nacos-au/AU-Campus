import type { BracketFixture } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { Trophy } from "lucide-react";
import Link from "next/link";
import type { SportId } from "@/lib/utils/sport";

const CARD_H = 52;
const CARD_GAP = 12;

export function WorldCupBracket({
  fixtures,
  sport,
  tournamentName,
}: {
  fixtures: BracketFixture[];
  sport: SportId;
  tournamentName: string;
}) {
  const rounds = [
    { key: "round_of_16", label: "Round of 16", count: 8 },
    { key: "quarter_final", label: "Quarter-finals", count: 4 },
    { key: "semi_final", label: "Semi-finals", count: 2 },
    { key: "final", label: "Final", count: 1 },
  ] as const;

  const byRound = (round: string) => fixtures.filter((f) => f.round === round);

  return (
    <div>
      {/* Mobile: stacked rounds */}
      <div className="space-y-8 lg:hidden">
        {rounds.map(({ key, label }) => {
          const items = byRound(key);
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <h3 className="mb-3 font-display text-xs font-extrabold uppercase tracking-wide opacity-50">{label}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((f) => (
                  <BracketCard key={f.id} fixture={f} sport={sport} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Desktop: symmetric tree */}
      <div className="hidden overflow-x-auto pb-4 lg:block">
        <div className="mx-auto flex min-w-[960px] items-center justify-center gap-0 py-6">
          <BracketRound fixtures={pad(byRound("round_of_16"), 8)} sport={sport} />
          <BracketConnector from={8} to={4} />
          <BracketRound fixtures={pad(byRound("quarter_final"), 4)} sport={sport} />
          <BracketConnector from={4} to={2} />
          <BracketRound fixtures={pad(byRound("semi_final"), 2)} sport={sport} />
          <BracketConnector from={2} to={1} />
          <div className="flex w-44 shrink-0 flex-col items-center justify-center px-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/30 bg-gradient-to-b from-white to-surface shadow-md">
              <Trophy className="h-8 w-8 text-accent" strokeWidth={2} />
            </div>
            <p className="mt-2 text-center font-display text-[10px] font-extrabold uppercase tracking-wide opacity-60">
              {tournamentName}
            </p>
            {byRound("final").map((f) => (
              <div key={f.id} className="mt-4 w-full">
                <BracketCard fixture={f} sport={sport} highlight />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function pad(fixtures: BracketFixture[], n: number): (BracketFixture | null)[] {
  const out: (BracketFixture | null)[] = [...fixtures];
  while (out.length < n) out.push(null);
  return out.slice(0, n);
}

function matchCenterY(index: number, count: number): number {
  const colH = count * CARD_H + (count - 1) * CARD_GAP;
  return index * (CARD_H + CARD_GAP) + CARD_H / 2 - colH / 2;
}

function BracketRound({
  fixtures,
  sport,
}: {
  fixtures: (BracketFixture | null)[];
  sport: SportId;
}) {
  const count = fixtures.length;
  const colH = count * CARD_H + (count - 1) * CARD_GAP;

  return (
    <div className="flex w-44 shrink-0 flex-col items-stretch justify-center" style={{ height: colH }}>
      {fixtures.map((f, i) => (
        <div key={f?.id ?? `tbd-${i}`} className="flex items-center" style={{ height: CARD_H, marginBottom: i < count - 1 ? CARD_GAP : 0 }}>
          {f ? <BracketCard fixture={f} sport={sport} /> : <TbdCard />}
        </div>
      ))}
    </div>
  );
}

function BracketConnector({ from, to }: { from: number; to: number }) {
  const fromH = from * CARD_H + (from - 1) * CARD_GAP;
  const pairs = to;

  return (
    <div className="relative w-10 shrink-0" style={{ height: fromH }}>
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {Array.from({ length: pairs }, (_, i) => {
          const y1 = matchCenterY(i * 2, from) + fromH / 2;
          const y2 = matchCenterY(i * 2 + 1, from) + fromH / 2;
          const yMid = (y1 + y2) / 2;
          const toY = matchCenterY(i, to) + fromH / 2;
          return (
            <g key={i}>
              <path d={`M 0 ${y1} H 14 V ${yMid} H 28`} fill="none" stroke="#d4d4d4" strokeWidth="1.5" />
              <path d={`M 0 ${y2} H 14 V ${yMid} H 28`} fill="none" stroke="#d4d4d4" strokeWidth="1.5" />
              <path d={`M 28 ${yMid} H 40 V ${toY} H 40`} fill="none" stroke="#d4d4d4" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BracketCard({
  fixture,
  sport,
  highlight,
}: {
  fixture: BracketFixture;
  sport: SportId;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "w-full rounded-lg border bg-white px-2.5 py-2 text-xs shadow-sm transition-shadow hover:shadow-md",
        highlight ? "border-accent ring-2 ring-accent/15" : "border-rule",
        fixture.status === "live" && "ring-2 ring-accent",
        fixture.status === "tbd" && "border-dashed opacity-50"
      )}
    >
      <TeamLine
        name={fixture.home_team_name}
        score={fixture.home_score}
        pens={fixture.home_penalties}
        opponentScore={fixture.away_score}
        opponentPens={fixture.away_penalties}
      />
      <TeamLine
        name={fixture.away_team_name}
        score={fixture.away_score}
        pens={fixture.away_penalties}
        opponentScore={fixture.home_score}
        opponentPens={fixture.home_penalties}
      />
      {fixture.home_penalties != null && fixture.away_penalties != null && (
        <p className="mt-1 border-t border-rule pt-1 text-center text-[9px] font-bold opacity-50">
          Pens {fixture.home_penalties}–{fixture.away_penalties} (5 each, sudden death)
        </p>
      )}
    </div>
  );

  if (fixture.match_id) {
    return <Link href={`/matches/${fixture.match_id}?sport=${sport}`}>{inner}</Link>;
  }
  return inner;
}

function TeamLine({
  name,
  score,
  pens,
  opponentScore,
  opponentPens,
}: {
  name: string | null;
  score: number | null;
  pens?: number | null;
  opponentScore: number | null;
  opponentPens?: number | null;
}) {
  const wonOnPens =
    score != null &&
    opponentScore != null &&
    score === opponentScore &&
    pens != null &&
    opponentPens != null &&
    pens > opponentPens;
  const isWinner =
    score != null && opponentScore != null && (score > opponentScore || wonOnPens);
  const isLoser =
    score != null && opponentScore != null && !isWinner && score !== opponentScore;

  return (
    <div className="flex items-center justify-between gap-1 py-0.5">
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-display font-bold",
          !name && "opacity-40",
          isWinner && "text-accent",
          isLoser && "opacity-60"
        )}
      >
        {name ?? "TBD"}
      </span>
      {score != null && (
        <span
          className={cn(
            "shrink-0 font-display font-extrabold tabular-nums",
            isWinner && "text-accent",
            isLoser && "opacity-60"
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function TbdCard() {
  return (
    <div className="w-full rounded-lg border border-dashed border-rule bg-surface/40 px-2.5 py-4 text-center text-xs opacity-40">
      TBD
    </div>
  );
}
