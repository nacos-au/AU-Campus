import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import type { PeriodScore } from "@/lib/types/database";

export type TimelineItem =
  | {
      kind: "divider";
      id: string;
      label: string;
    }
  | {
      kind: "added_time";
      id: string;
      minutes: number;
    }
  | {
      kind: "event";
      id: string;
      side: "home" | "away";
      event: DemoMatchEvent;
      scoreLabel?: string;
    };

function parseMinute(matchTime: string): number {
  const t = matchTime.trim();
  if (t.toLowerCase().includes("pen")) return 200;
  const et = t.match(/ET\s*(\d+)/i);
  if (et) return 90 + parseInt(et[1], 10);
  const stoppage = t.match(/(\d+)\+(\d+)/);
  if (stoppage) return parseInt(stoppage[1], 10) + parseInt(stoppage[2], 10) / 100;
  const m = t.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function isGoalType(type: string): boolean {
  return type === "goal" || type === "penalty_scored";
}

export function buildFootballTimeline(
  events: DemoMatchEvent[],
  homeTeamId: string,
  periodScores: PeriodScore[],
  finalHome: number,
  finalAway: number,
  isCompleted: boolean
): TimelineItem[] {
  const playable = events.filter((e) => e.period !== "penalty_shootout");
  const chronological = [...playable].sort((a, b) => parseMinute(a.match_time) - parseMinute(b.match_time));

  const scoreAtEvent = new Map<string, string>();
  let homeScore = 0;
  let awayScore = 0;
  for (const event of chronological) {
    if (isGoalType(event.event_type)) {
      if (event.team_id === homeTeamId) homeScore += 1;
      else awayScore += 1;
      scoreAtEvent.set(event.id, `${homeScore} - ${awayScore}`);
    }
  }

  const descending = [...chronological].sort((a, b) => parseMinute(b.match_time) - parseMinute(a.match_time));
  const items: TimelineItem[] = [];
  const htScore = periodScores.find((p) => p.period === "half_1");
  const h2Score = periodScores.find((p) => p.period === "half_2");
  let insertedHt = false;
  let insertedFt90 = false;
  let insertedAddedTime = false;

  if (isCompleted) {
    items.push({
      kind: "divider",
      id: "ft-header",
      label: `FT ${finalHome} - ${finalAway}`,
    });
  }

  for (const event of descending) {
    const side: "home" | "away" = event.team_id === homeTeamId ? "home" : "away";

    if (event.period === "half_1" && !insertedHt && descending.some((e) => e.period === "half_2" || e.period === "extra_time")) {
      items.push({
        kind: "divider",
        id: "ht",
        label: `HT ${htScore ? `${htScore.home_score} - ${htScore.away_score}` : "0 - 0"}`,
      });
      insertedHt = true;
    }

    if (event.period === "half_2" && !insertedFt90 && descending.some((e) => e.period === "extra_time")) {
      const ftHome = (htScore?.home_score ?? 0) + (h2Score?.home_score ?? 0);
      const ftAway = (htScore?.away_score ?? 0) + (h2Score?.away_score ?? 0);
      items.push({
        kind: "divider",
        id: "ft-90",
        label: `FT ${ftHome} - ${ftAway}`,
      });
      insertedFt90 = true;
    }

    if (event.match_time.includes("+") && event.period === "half_2" && !insertedAddedTime) {
      items.push({ kind: "added_time", id: "at-1", minutes: 7 });
      insertedAddedTime = true;
    }

    items.push({
      kind: "event",
      id: event.id,
      side,
      event,
      scoreLabel: scoreAtEvent.get(event.id),
    });
  }

  return items;
}

export function playerShortName(first: string, last: string): string {
  return `${first[0]}. ${last}`;
}
