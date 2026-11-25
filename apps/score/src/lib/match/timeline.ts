import type { DemoMatchEvent } from "@/lib/data/demo-match-details";

export interface TimelineMarker {
  id: string;
  minute: number;
  type: string;
  label: string;
  teamCode: string;
}

/** Public clock label — omit unknown/manual placeholders like "?" entirely. */
export function displayMatchTime(matchTime: string | null | undefined): string | null {
  const t = (matchTime ?? "").trim();
  if (!t || t === "?" || t === "—" || t.toLowerCase() === "unknown") return null;
  return t;
}

/** Parse "12'", "90+3'", "ET 105'", "Q3 02:14" into approximate minute 0–120 for football */
export function parseEventMinute(matchTime: string, sport: string): number {
  if (sport !== "football") return 0;
  const et = matchTime.match(/ET\s*(\d+)/i);
  if (et) return 90 + parseInt(et[1], 10);
  const stoppage = matchTime.match(/(\d+)\+(\d+)/);
  if (stoppage) return parseInt(stoppage[1], 10) + parseInt(stoppage[2], 10);
  const basic = matchTime.match(/(\d+)/);
  if (basic) return parseInt(basic[1], 10);
  if (matchTime.toLowerCase().includes("pen")) return 120;
  return 0;
}

export function eventsToMarkers(events: DemoMatchEvent[], sport: string): TimelineMarker[] {
  return events.map((e) => ({
    id: e.id,
    minute: parseEventMinute(e.match_time, sport),
    type: e.event_type,
    label: formatEventLabel(e.event_type),
    teamCode: e.team_code,
  }));
}

export function formatEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    goal: "Goal",
    own_goal: "OG",
    disallowed_goal: "Disallowed",
    disallowed: "Disallowed",
    shot_on_target: "SOT",
    penalty_scored: "Pen ✓",
    penalty_missed: "Pen ✗",
    yellow_card: "YC",
    red_card: "RC",
    warning: "Warn",
    foul: "Foul",
    offside: "Offside",
    corner: "Corner",
    save: "Save",
    stoppage_boarded: "Stoppage",
    added_time: "Added time",
    two_pointer: "2PT",
    field_goal: "3PT",
    free_throw: "FT",
    foul_personal: "Personal",
    foul_technical: "Technical",
    timeout: "Timeout",
    error: "Error",
    set_won: "Set",
    point_won: "Point",
    free_throw_missed: "FT miss",
    winner: "Winner",
    game_won: "Game",
    fault: "Fault",
    double_fault: "Dbl fault",
    dnf: "DNF",
    false_start: "False start",
    kill: "Kill",
    block: "Block",
    ace: "Ace",
    finish: "Finish",
    break_point_won: "Break",
    substitution: "Sub",
  };
  return labels[eventType] ?? eventType.replace(/_/g, " ");
}

export function markerColor(type: string): string {
  if (type.includes("goal") || type === "penalty_scored" || type === "field_goal" || type === "two_pointer") return "#004e28";
  if (type === "penalty_missed") return "#7a1f2b";
  if (type.includes("yellow")) return "#eab308";
  if (type.includes("red")) return "#dc2626";
  return "#7a1f2b";
}
