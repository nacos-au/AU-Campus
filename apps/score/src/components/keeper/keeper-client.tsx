"use client";

import { useSearchParams } from "next/navigation";
import { SportKeeperTabs } from "@/components/admin/image-upload-field";
import { SportKeeper } from "@/components/keeper/sport-keeper";
import { DEMO_MATCHES } from "@/lib/data/demo";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { useState } from "react";

const KEEPER_SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis", "track"];

export function KeeperClient() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get("sport") as SportId) || "football";
  const matchIdParam = searchParams.get("match");
  const [sport, setSport] = useState<SportId>(KEEPER_SPORTS.includes(initial) ? initial : "football");
  const sportDbId = `sport-${sport}`;
  const match =
    (matchIdParam ? DEMO_MATCHES.find((m) => m.id === matchIdParam) : null) ??
    DEMO_MATCHES.find((m) => m.status === "live" && m.sport_id === sportDbId) ??
    DEMO_MATCHES.find((m) => m.sport_id === sportDbId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SportKeeperTabs
        sports={KEEPER_SPORTS.map((s) => ({ id: s, label: SPORT_LABELS[s] }))}
        active={sport}
        onChange={(id) => setSport(id as SportId)}
      />

      {!match ? (
        <p className="mt-8 text-center opacity-70">No demo match for {SPORT_LABELS[sport]}.</p>
      ) : (
        <SportKeeper key={`${match.id}-${sport}`} match={match} sport={sport} />
      )}
    </div>
  );
}
