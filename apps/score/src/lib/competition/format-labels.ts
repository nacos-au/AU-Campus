export const FORMAT_LABELS: Record<string, string> = {
  league: "Round robin league",
  group_knockout: "Group stage + knockout",
  knockout_only: "Straight knockout",
};

/** Brief explanations shown in competition details. */
export const FORMAT_DESCRIPTIONS: Record<string, string> = {
  league:
    "Every team plays each other (often home and away). The table ranks sides by points won across the season.",
  group_knockout:
    "Teams are split into groups for round-robin matches; the top finishers from each group advance into a knockout bracket.",
  knockout_only:
    "Single-elimination bracket — one loss and you're out until a champion is crowned.",
};

export function formatLabel(format?: string): string {
  if (!format) return "";
  return FORMAT_LABELS[format] ?? format;
}

export function formatDescription(format?: string): string | undefined {
  if (!format) return undefined;
  return FORMAT_DESCRIPTIONS[format];
}
