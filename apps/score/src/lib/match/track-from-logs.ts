import type { KeeperLogEntry } from "@/lib/keeper/keeper-events";
import type { TrackResult } from "@/lib/types/database";
import { DEMO_PLAYERS, DEMO_DEPARTMENTS } from "@/lib/data/demo";
import { playerAvatarForId } from "@/lib/utils/sport-assets";

export type TrackResultStatus = "finished" | "dnf" | "false_start" | "dns";

export interface ComputedTrackResult extends TrackResult {
  status: TrackResultStatus;
  log_id?: string;
}

/** Parse "10.58" or "10:58.2" into milliseconds */
export function parseTimeToMs(input: string): number | null {
  const trimmed = input.trim().replace(/s$/i, "");
  if (!trimmed || trimmed.toLowerCase() === "dnf") return null;

  if (trimmed.includes(":")) {
    const [minPart, secPart] = trimmed.split(":");
    const mins = parseInt(minPart, 10);
    const secs = parseFloat(secPart);
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return Math.round((mins * 60 + secs) * 1000);
  }

  const secs = parseFloat(trimmed);
  if (Number.isNaN(secs)) return null;
  return Math.round(secs * 1000);
}

export function formatMs(ms: number): string {
  if (ms >= 60000) {
    const m = Math.floor(ms / 60000);
    const s = (ms % 60000) / 1000;
    return `${m}:${s.toFixed(2).padStart(5, "0")}`;
  }
  return (ms / 1000).toFixed(2);
}

export function computeTrackResultsFromLogs(logs: KeeperLogEntry[]): ComputedTrackResult[] {
  const rows: ComputedTrackResult[] = [];

  for (const log of logs) {
    const player = DEMO_PLAYERS.find((p) => p.id === log.player_id);
    const dept = DEMO_DEPARTMENTS.find((d) => d.id === player?.department_id);
    const name = log.player_name || (player ? `${player.first_name} ${player.last_name}` : "Unknown");
    const code = log.team_code || dept?.short_code || "—";
    const lane = typeof log.details?.lane === "number" ? log.details.lane : (player ? undefined : 0);

    const playerId = log.player_id ?? `track-log-${log.id}`;

    if (log.event_type === "finish") {
      const timeDisplay = String(log.details?.time_display ?? log.match_time ?? "");
      const timeMs = parseTimeToMs(timeDisplay) ?? 0;
      rows.push({
        rank: 0,
        lane: lane ?? rows.length + 1,
        player_id: playerId,
        athlete_name: name,
        department_code: code,
        time_ms: timeMs,
        time_display: timeDisplay || formatMs(timeMs),
        avatar_url: player?.avatar_url ?? playerAvatarForId(playerId),
        status: "finished",
        log_id: log.id,
      });
    } else if (log.event_type === "dnf") {
      rows.push({
        rank: 0,
        lane: lane ?? rows.length + 1,
        player_id: playerId,
        athlete_name: name,
        department_code: code,
        time_ms: 0,
        time_display: "DNF",
        avatar_url: player?.avatar_url ?? playerAvatarForId(playerId),
        status: "dnf",
        log_id: log.id,
      });
    } else if (log.event_type === "false_start") {
      rows.push({
        rank: 0,
        lane: lane ?? rows.length + 1,
        player_id: playerId,
        athlete_name: name,
        department_code: code,
        time_ms: 0,
        time_display: "DSQ",
        avatar_url: player?.avatar_url ?? playerAvatarForId(playerId),
        status: "false_start",
        log_id: log.id,
      });
    }
  }

  const finished = rows
    .filter((r) => r.status === "finished" && r.time_ms > 0)
    .sort((a, b) => a.time_ms - b.time_ms);

  let rank = 1;
  for (const r of finished) {
    r.rank = rank++;
  }

  const nonFinishers = rows.filter((r) => r.status !== "finished" || r.time_ms === 0);
  for (const r of nonFinishers) {
    if (r.status !== "finished") r.rank = 0;
  }

  return [...finished, ...nonFinishers.filter((r) => r.status !== "finished")];
}
