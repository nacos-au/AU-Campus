import type { SportId } from "@/lib/utils/sport";

const PERIOD_STATUS_LABELS: Record<string, string> = {
  half_time: "Half time",
  halftime: "Half time",
  extra_time: "Extra time",
  penalty_shootout: "Penalties",
  full_time: "Finished",
};

export function matchPeriodStatusLabel(period: string, sport: SportId): string | null {
  if (PERIOD_STATUS_LABELS[period]) return PERIOD_STATUS_LABELS[period];

  if (sport === "basketball" && period.startsWith("quarter_")) {
    return period.replace("quarter_", "Q").toUpperCase();
  }

  if ((sport === "volleyball" || sport === "tennis") && period.startsWith("set_")) {
    return `Set ${period.replace("set_", "")}`;
  }

  if (sport === "track" && period === "final") return "Final";
  if (sport === "track" && period === "heat") return "Heat";

  return null;
}
