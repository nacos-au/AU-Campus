/**
 * Open-play goals: prefer assister or Solo.
 * Reconcile / early ops may mark assist_pending until names are confirmed.
 * Live keeper should still push for assist or Solo (not pending).
 */

export const OPEN_PLAY_GOAL_TYPES = new Set(["goal"]);

export function requiresAssistChoice(eventType: string): boolean {
  return OPEN_PLAY_GOAL_TYPES.has(eventType);
}

export function goalHasAssistOrSolo(details: Record<string, unknown> | null | undefined): boolean {
  if (!details) return false;
  if (details.solo_goal === true) return true;
  if (details.assist_pending === true) return true;
  const assistId = details.assist_player_id;
  const assistName = details.assist_player_name;
  return (
    (typeof assistId === "string" && assistId.length > 0) ||
    (typeof assistName === "string" && assistName.trim().length > 0)
  );
}

export function validateGoalAssist(
  eventType: string,
  details: Record<string, unknown> | null | undefined,
  opts?: { allowPending?: boolean }
): string | null {
  if (!requiresAssistChoice(eventType)) return null;
  if (goalHasAssistOrSolo(details)) return null;
  if (opts?.allowPending) return null;
  return "Open-play goals need an assister, Solo goal, or Pending assist.";
}
