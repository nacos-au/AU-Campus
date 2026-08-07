/** Premier League–style football table maths. */
export const FOOTBALL_POINTS = {
  win: 3,
  draw: 1,
  loss: 0,
} as const;

export function footballPointsForResult(
  goalsFor: number,
  goalsAgainst: number
): number {
  if (goalsFor > goalsAgainst) return FOOTBALL_POINTS.win;
  if (goalsFor < goalsAgainst) return FOOTBALL_POINTS.loss;
  return FOOTBALL_POINTS.draw;
}

/** Sanity check: W×3 + D×1 + L×0 */
export function footballTablePoints(won: number, drawn: number, lost = 0): number {
  void lost;
  return won * FOOTBALL_POINTS.win + drawn * FOOTBALL_POINTS.draw;
}
