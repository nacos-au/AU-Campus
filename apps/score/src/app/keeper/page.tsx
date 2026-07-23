"use client";

import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { DEMO_MATCHES } from "@/lib/data/demo";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

export default function KeeperPage() {
  const match = DEMO_MATCHES.find((m) => m.status === "live" && m.sport_id === "sport-football");
  const [timeLost, setTimeLost] = useState(false);

  if (!match) {
    return (
      <>
        <BrandedSection title="Record Keeper" activeSport="football" />
        <PageContent>
          <p className="p-8 text-center opacity-70">No live matches assigned</p>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <BrandedSection title="Record Keeper" activeSport="football" />
      <PageContent>
        <div className="mx-auto max-w-md px-4 py-8">
          <h1 className="text-center font-display text-lg font-bold">
            {match.home_team?.name} vs {match.away_team?.name}
          </h1>
          <div className="mt-8 border border-rule p-6 text-center">
            <p className="text-xs font-bold uppercase opacity-70">Match Time</p>
            <p className="mt-2 font-mono text-5xl font-bold">41:24</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTimeLost(false)}
                className={cn("border py-4 font-display text-sm font-bold", !timeLost ? "border-accent bg-accent text-white" : "border-rule")}
              >
                PLAY
              </button>
              <button
                type="button"
                onClick={() => setTimeLost(true)}
                className={cn("border py-4 font-display text-sm font-bold", timeLost ? "border-accent bg-accent text-white" : "border-rule")}
              >
                TIME LOST
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {["+ Goal", "+ Yellow", "+ Red", "Sub"].map((a) => (
              <button key={a} type="button" className="border border-rule py-5 font-display text-sm font-bold">
                {a}
              </button>
            ))}
          </div>
        </div>
      </PageContent>
    </>
  );
}
