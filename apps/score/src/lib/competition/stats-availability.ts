import type { Tournament } from "@/lib/types/database";

/**
 * Competitions can opt out of public Stats Centre leaderboards
 * (e.g. score-only preseason with no scorers planned).
 *
 * Set on tournament.config:
 *   { "omit_stats": true }  or  { "stats_available": false }
 */
export function tournamentOmitsStats(
  tournament: Pick<Tournament, "config"> | null | undefined
): boolean {
  const config = tournament?.config;
  if (!config || typeof config !== "object") return false;
  if (config.omit_stats === true) return true;
  if (config.stats_available === false) return true;
  return false;
}
