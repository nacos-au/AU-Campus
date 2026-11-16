"use client";

import { useEffect, useState } from "react";
import { AwardsShowcase } from "@/components/stats/awards-showcase";
import type { SeasonAward } from "@/lib/data/demo-awards";
import {
  ADMIN_AWARDS_STORAGE_KEY,
  getAwardsForSport,
  loadAwardOverridesFromStorage,
} from "@/lib/data/demo-awards";
import type { SportId } from "@/lib/utils/sport";

export function StatsAwardsSection({
  sportDbId,
  sport,
  initialAwards,
  competitionId,
  competitionType = "league",
  demoMode = false,
}: {
  sportDbId: string;
  sport: SportId;
  initialAwards: SeasonAward[];
  competitionId?: string;
  competitionType?: "league" | "cup" | "event";
  demoMode?: boolean;
}) {
  const [awards, setAwards] = useState(initialAwards);

  useEffect(() => {
    setAwards(initialAwards);
  }, [initialAwards]);

  useEffect(() => {
    if (!demoMode) {
      let cancelled = false;
      void (async () => {
        try {
          const res = await fetch(`/api/awards?sport=${sport}`);
          const json = (await res.json()) as { awards?: SeasonAward[] };
          if (!cancelled) setAwards(json.awards ?? []);
        } catch {
          if (!cancelled) setAwards(initialAwards);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const overrides = loadAwardOverridesFromStorage();
    setAwards(getAwardsForSport(sportDbId, overrides, competitionId));
  }, [demoMode, sport, sportDbId, competitionId, initialAwards]);

  useEffect(() => {
    if (!demoMode) return;
    function onStorage(e: StorageEvent) {
      if (e.key === ADMIN_AWARDS_STORAGE_KEY) {
        const overrides = loadAwardOverridesFromStorage();
        setAwards(getAwardsForSport(sportDbId, overrides, competitionId));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [demoMode, sportDbId, competitionId]);

  return <AwardsShowcase awards={awards} sport={sport} competitionType={competitionType} />;
}
