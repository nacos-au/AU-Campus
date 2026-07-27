"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { TeamCrest } from "@/components/ui/team-crest";
import { SignInModal } from "@/components/ui/sign-in-modal";
import type { WinProbability } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

type VoteChoice = "home" | "draw" | "away";

interface TeamInfo {
  name: string;
  logoUrl?: string | null;
  shortCode: string;
}

function formatVoteTotal(): string {
  return "15k";
}

export function WinProbabilityVote({
  data,
  showDraw = true,
  homeTeam,
  awayTeam,
  isCompleted = false,
}: {
  matchId?: string;
  data: WinProbability;
  showDraw?: boolean;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  isCompleted?: boolean;
}) {
  const [signInOpen, setSignInOpen] = useState(false);
  const showResults = isCompleted;
  const { home, draw, away } = data.votes;

  function handleClick() {
    if (!isCompleted) setSignInOpen(true);
  }

  return (
    <>
      <section className="table-card p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-extrabold text-accent">Who will win?</h3>
            {showResults && (
              <p className="mt-0.5 text-xs text-accent/60">Total votes: {formatVoteTotal()}</p>
            )}
          </div>
          <Trophy className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        </div>

        <div className={cn("grid gap-2 sm:gap-3", showDraw ? "grid-cols-3" : "grid-cols-2")}>
          <VoteButton
            label={homeTeam.shortCode}
            crest={<TeamCrest code={homeTeam.shortCode} logoUrl={homeTeam.logoUrl} alt={homeTeam.name} size="sm" />}
            percent={home}
            showResults={showResults}
            onClick={handleClick}
          />
          {showDraw && (
            <VoteButton
              label="Draw"
              percent={draw}
              showResults={showResults}
              onClick={handleClick}
            />
          )}
          <VoteButton
            label={awayTeam.shortCode}
            crest={<TeamCrest code={awayTeam.shortCode} logoUrl={awayTeam.logoUrl} alt={awayTeam.name} size="sm" />}
            percent={away}
            showResults={showResults}
            onClick={handleClick}
          />
        </div>
      </section>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}

function VoteButton({
  label,
  crest,
  percent,
  showResults,
  onClick,
}: {
  label: string;
  crest?: React.ReactNode;
  percent: number;
  showResults: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={showResults}
      className={cn(
        "relative flex min-h-[48px] items-center overflow-hidden rounded-full border px-3 py-2.5 transition-colors",
        showResults ? "cursor-default justify-between border-rule bg-white" : "justify-center border-accent/30 bg-white hover:border-accent hover:bg-accent/5",
      )}
    >
      {showResults && (
        <span
          className="absolute inset-y-0 left-0 bg-accent/8"
          style={{ width: `${percent}%` }}
          aria-hidden
        />
      )}
      <span className="relative z-[1] flex items-center gap-1.5">
        {crest}
        {!crest && <span className="font-display text-sm font-bold text-accent">{label}</span>}
      </span>
      {showResults && (
        <span className="relative z-[1] font-display text-sm font-extrabold tabular-nums text-accent">
          {percent}%
        </span>
      )}
    </button>
  );
}

/** @deprecated Use WinProbabilityVote — kept for any legacy imports */
export function WinProbabilityBars({
  data,
  showDraw = true,
}: {
  data: WinProbability;
  showDraw?: boolean;
}) {
  return (
    <div className="space-y-2 text-xs opacity-70">
      <p>Home {data.votes.home}% · {showDraw && `Draw ${data.votes.draw}% · `}Away {data.votes.away}%</p>
    </div>
  );
}
