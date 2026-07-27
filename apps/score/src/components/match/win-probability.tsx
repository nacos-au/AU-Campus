"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Trophy } from "lucide-react";
import { TeamCrest } from "@/components/ui/team-crest";
import type { WinProbability } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

type VoteChoice = "home" | "draw" | "away";

interface TeamInfo {
  name: string;
  logoUrl?: string | null;
  shortCode: string;
}

function voteStorageKey(matchId: string) {
  return `au-score-match-vote-${matchId}`;
}

function formatVoteTotal(): string {
  return "2.7k";
}

export function WinProbabilityVote({
  matchId,
  data,
  showDraw = true,
  homeTeam,
  awayTeam,
}: {
  matchId: string;
  data: WinProbability;
  showDraw?: boolean;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
}) {
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(voteStorageKey(matchId)) as VoteChoice | null;
    if (stored === "home" || stored === "draw" || stored === "away") {
      setChoice(stored);
    }
    setHydrated(true);
  }, [matchId]);

  function castVote(vote: VoteChoice) {
    localStorage.setItem(voteStorageKey(matchId), vote);
    setChoice(vote);
    setEditing(false);
  }

  function clearVote() {
    localStorage.removeItem(voteStorageKey(matchId));
    setChoice(null);
    setEditing(true);
  }

  const showResults = hydrated && choice !== null && !editing;
  const { home, draw, away } = data.votes;

  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-extrabold text-accent">Who will win?</h3>
          <p className="mt-0.5 text-xs text-accent/60">
            {showResults ? (
              <>Total votes: {formatVoteTotal()}</>
            ) : (
              <>
                Cast your vote!{" "}
                <Link href="/auth/login" className="font-semibold text-accent underline underline-offset-2">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showResults && (
            <>
              <button
                type="button"
                onClick={clearVote}
                className="flex h-8 w-8 items-center justify-center rounded-full text-accent hover:bg-white"
                aria-label="Edit choice"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <span className="h-5 w-px bg-rule" aria-hidden />
            </>
          )}
          <Trophy className="h-5 w-5 text-accent" aria-hidden />
        </div>
      </div>

      <div className={cn("grid gap-2", showDraw ? "grid-cols-3" : "grid-cols-2")}>
        <VoteButton
          label={homeTeam.shortCode}
          crest={<TeamCrest code={homeTeam.shortCode} logoUrl={homeTeam.logoUrl} alt={homeTeam.name} size="sm" />}
          percent={home}
          selected={choice === "home"}
          showResults={showResults}
          onClick={() => castVote("home")}
        />
        {showDraw && (
          <VoteButton
            label="Draw"
            percent={draw}
            selected={choice === "draw"}
            showResults={showResults}
            onClick={() => castVote("draw")}
          />
        )}
        <VoteButton
          label={awayTeam.shortCode}
          crest={<TeamCrest code={awayTeam.shortCode} logoUrl={awayTeam.logoUrl} alt={awayTeam.name} size="sm" />}
          percent={away}
          selected={choice === "away"}
          showResults={showResults}
          onClick={() => castVote("away")}
        />
      </div>
    </div>
  );
}

function VoteButton({
  label,
  crest,
  percent,
  selected,
  showResults,
  onClick,
}: {
  label: string;
  crest?: React.ReactNode;
  percent: number;
  selected: boolean;
  showResults: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[44px] items-center overflow-hidden rounded-full border px-3 py-2 transition-colors",
        showResults ? "justify-between" : "justify-center",
        showResults
          ? selected
            ? "border-accent bg-accent/10"
            : "border-rule bg-white"
          : selected
            ? "border-accent bg-accent/10"
            : "border-accent/40 bg-white hover:border-accent hover:bg-accent/5"
      )}
    >
      {showResults && (
        <span
          className={cn(
            "absolute inset-y-0 left-0 bg-accent/10",
            selected && "bg-accent/15"
          )}
          style={{ width: `${percent}%` }}
          aria-hidden
        />
      )}
      <span className="relative z-[1] flex items-center gap-1.5">
        {crest}
        {!crest && <span className="font-display text-xs font-bold text-accent">{label}</span>}
      </span>
      {showResults && (
        <span className="relative z-[1] font-display text-xs font-extrabold tabular-nums text-accent">
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
