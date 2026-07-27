"use client";

import { useEffect, useState } from "react";
import { AwardsShowcase } from "@/components/stats/awards-showcase";
import type { SeasonAward } from "@/lib/data/demo-awards";
import { ADMIN_AWARDS_STORAGE_KEY, getAwardsForSport, loadAwardOverridesFromStorage } from "@/lib/data/demo-awards";
import type { SportId } from "@/lib/utils/sport";

export function StatsAwardsSection({
  sportDbId,
  sport,
  initialAwards,
  competitionId,
  competitionType = "league",
}: {
  sportDbId: string;
  sport: SportId;
  initialAwards: SeasonAward[];
  competitionId?: string;
  competitionType?: "league" | "cup";
}) {
  const [awards, setAwards] = useState(initialAwards);

  useEffect(() => {
    const overrides = loadAwardOverridesFromStorage();
    setAwards(getAwardsForSport(sportDbId, overrides, competitionId));
  }, [sportDbId, competitionId]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === ADMIN_AWARDS_STORAGE_KEY) {
        const overrides = loadAwardOverridesFromStorage();
        setAwards(getAwardsForSport(sportDbId, overrides, competitionId));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [sportDbId, competitionId]);

  return <AwardsShowcase awards={awards} sport={sport} competitionType={competitionType} />;
}
