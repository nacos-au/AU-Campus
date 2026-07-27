import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import type { Player } from "@/lib/types/database";
import { formatEventLabel } from "@/lib/match/timeline";

export type KeeperEventType = string;

export interface KeeperLogEntry {
  id: string;
  match_time: string;
  period: string;
  team_id: string;
  team_name: string;
  team_code: string;
  team_logo_url: string | null;
  player_id: string | null;
  player_name: string;
  event_type: KeeperEventType;
  assist_player_id?: string | null;
  assist_player_name?: string | null;
  details?: Record<string, unknown> | null;
}

export function keeperLogsStorageKey(matchId: string) {
  return `au-score-keeper-logs-${matchId}`;
}

export function createKeeperLog(
  partial: Omit<KeeperLogEntry, "id"> & { id?: string }
): KeeperLogEntry {
  return { id: partial.id ?? crypto.randomUUID(), ...partial };
}

export function toDemoMatchEvent(entry: KeeperLogEntry, player: Player): DemoMatchEvent {
  return {
    id: entry.id,
    match_id: "",
    player,
    team_id: entry.team_id,
    team_name: entry.team_name,
    team_code: entry.team_code,
    team_logo_url: entry.team_logo_url,
    event_type: entry.event_type,
    match_time: entry.match_time,
    period: entry.period,
    details: entry.assist_player_name ? { assist_player_name: entry.assist_player_name } : null,
  };
}

export function entryLabel(entry: KeeperLogEntry): string {
  const action = formatEventLabel(entry.event_type);
  if (entry.event_type === "corner" || entry.event_type === "timeout" || entry.event_type === "point_won") {
    return `${entry.team_name} — ${action}`;
  }
  const base = `${entry.player_name} — ${action}`;
  if (entry.assist_player_name) return `${base} (assist: ${entry.assist_player_name})`;
  if (entry.details?.time_display) return `${base} (${entry.details.time_display}s)`;
  return base;
}

export function scoreFromLogs(
  logs: KeeperLogEntry[],
  homeTeamId: string,
  awayTeamId: string,
  compute: (logs: KeeperLogEntry[], home: string, away: string) => { home: number; away: number }
): { home: number; away: number } {
  return compute(logs, homeTeamId, awayTeamId);
}
