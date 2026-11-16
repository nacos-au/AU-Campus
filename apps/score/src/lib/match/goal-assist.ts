/** Open-play goals require an assister or an explicit solo_goal flag. */

export const OPEN_PLAY_GOAL_TYPES = new Set(["goal"]);

export function requiresAssistChoice(eventType: string): boolean {
  return OPEN_PLAY_GOAL_TYPES.has(eventType);
}

export function goalHasAssistOrSolo(details: Record<string, unknown> | null | undefined): boolean {
  if (!details) return false;
  if (details.solo_goal === true) return true;
  const assistId = details.assist_player_id;
  const assistName = details.assist_player_name;
  return (
    (typeof assistId === "string" && assistId.length > 0) ||
    (typeof assistName === "string" && assistName.trim().length > 0)
  );
}

export function validateGoalAssist(
  eventType: string,
  details: Record<string, unknown> | null | undefined
): string | null {
  if (!requiresAssistChoice(eventType)) return null;
  if (goalHasAssistOrSolo(details)) return null;
  return "Open-play goals need an assister or Solo goal.";
}
