"use client";

import { useSearchParams } from "next/navigation";
import { SportKeeperTabs } from "@/components/admin/image-upload-field";
import { AdminPostResultTool } from "@/components/admin/admin-post-result-tool";
import { SportKeeper } from "@/components/keeper/sport-keeper";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { useMemo, useState } from "react";

const KEEPER_SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis", "track"];

export function KeeperClient() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get("sport") as SportId) || "football";
  const matchIdParam = searchParams.get("match");
  const [sport, setSport] = useState<SportId>(KEEPER_SPORTS.includes(initial) ? initial : "football");
  const [mode, setMode] = useState<"live" | "manual">("live");
  const sportDbId = `sport-${sport}`;
  const matches = useMemo(() => listAllDemoMatches(), []);
  const match =
    (matchIdParam ? matches.find((m) => m.id === matchIdParam) : null) ??
    matches.find((m) => m.status === "live" && m.sport_id === sportDbId) ??
    matches.find((m) => m.sport_id === sportDbId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SportKeeperTabs
        sports={KEEPER_SPORTS.map((s) => ({ id: s, label: SPORT_LABELS[s] }))}
        active={sport}
        onChange={(id) => setSport(id as SportId)}
      />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("live")}
          className={`rounded-lg px-3 py-1.5 font-display text-sm font-bold ${
            mode === "live" ? "bg-accent text-white" : "border border-rule"
          }`}
        >
          Live keeper
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded-lg px-3 py-1.5 font-display text-sm font-bold ${
            mode === "manual" ? "bg-accent text-white" : "border border-rule"
          }`}
        >
          Post result
        </button>
      </div>

      {mode === "manual" ? (
        <div className="mt-6">
          <AdminPostResultTool />
        </div>
      ) : !match ? (
        <p className="mt-8 text-center opacity-70">No match for {SPORT_LABELS[sport]}.</p>
      ) : (
        <SportKeeper key={`${match.id}-${sport}`} match={match} sport={sport} />
      )}
    </div>
  );
}
