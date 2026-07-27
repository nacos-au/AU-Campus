import type { TrackResult } from "@/lib/types/database";
import type { ComputedTrackResult } from "@/lib/match/track-from-logs";

export interface PodiumEntry {
  rank: 1 | 2 | 3;
  label: string;
  subtitle?: string;
  value: string;
  player_id?: string;
  team_id?: string;
  avatar_url?: string | null;
}

export interface PodiumSet {
  title: string;
  entries: PodiumEntry[];
}

export function podiumFromTrackResults(results: (TrackResult | ComputedTrackResult)[]): PodiumSet {
  const finishers = results
    .filter((r) => r.time_display !== "DNF" && r.time_display !== "DSQ" && r.time_ms > 0)
    .sort((a, b) => a.time_ms - b.time_ms)
    .slice(0, 3);

  const entries: PodiumEntry[] = finishers.map((r, i) => ({
    rank: (i + 1) as 1 | 2 | 3,
    label: r.athlete_name,
    subtitle: r.department_code,
    value: `${r.time_display}s`,
    player_id: r.player_id,
    avatar_url: r.avatar_url,
  }));

  return { title: "Podium", entries };
}

/** Sets-won podium for tennis/volleyball team matches */
export function podiumFromTeamScore(
  homeName: string,
  awayName: string,
  homeScore: number,
  awayScore: number,
  homeId?: string,
  awayId?: string
): PodiumSet | null {
  if (homeScore === awayScore) return null;
  const winner = homeScore > awayScore ? { name: homeName, score: homeScore, id: homeId } : { name: awayName, score: awayScore, id: awayId };
  const runner = homeScore > awayScore ? { name: awayName, score: awayScore, id: awayId } : { name: homeName, score: homeScore, id: homeId };

  return {
    title: "Match result",
    entries: [
      { rank: 1, label: winner.name, value: `${winner.score} sets`, team_id: winner.id },
      { rank: 2, label: runner.name, value: `${runner.score} sets`, team_id: runner.id },
    ],
  };
}

/** Football / basketball final podium */
export function podiumFromPointsMatch(
  homeName: string,
  awayName: string,
  homeScore: number,
  awayScore: number,
  unit: string,
  homeId?: string,
  awayId?: string
): PodiumSet | null {
  if (homeScore === awayScore) return null;
  const winner = homeScore > awayScore ? { name: homeName, score: homeScore, id: homeId } : { name: awayName, score: awayScore, id: awayId };
  const runner = homeScore > awayScore ? { name: awayName, score: awayScore, id: awayId } : { name: homeName, score: homeScore, id: homeId };

  return {
    title: "Final",
    entries: [
      { rank: 1, label: winner.name, value: `${winner.score} ${unit}`, team_id: winner.id },
      { rank: 2, label: runner.name, value: `${runner.score} ${unit}`, team_id: runner.id },
    ],
  };
}
