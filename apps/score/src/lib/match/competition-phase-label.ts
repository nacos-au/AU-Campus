/** Human label for match.competition_phase (e.g. matchday_1 → Match day 1). */
export function competitionPhaseLabel(phase: string | null | undefined): string | null {
  if (!phase?.trim()) return null;
  const raw = phase.trim();
  const matchday = /^matchday[_-]?(\d+)$/i.exec(raw);
  if (matchday) return `Match day ${Number(matchday[1])}`;
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
