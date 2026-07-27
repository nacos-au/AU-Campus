/** Rows from back (GK) to front (attack), excluding GK row. */
export function parseFormation(formation: string): number[] {
  return formation.split("-").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
}

export function formationSlotPosition(
  side: "home" | "away",
  rowIndex: number,
  colIndex: number,
  colsInRow: number,
  totalRows: number
): { left: number; top: number } {
  const isGk = rowIndex === 0;
  const outfieldRows = totalRows - 1;
  const rowProgress = isGk ? 0 : rowIndex / outfieldRows;

  const homeLeft = isGk ? 6 : 14 + rowProgress * 30;
  const awayLeft = isGk ? 94 : 86 - rowProgress * 30;
  const left = side === "home" ? homeLeft : awayLeft;

  const top = colsInRow === 1 ? 50 : 16 + (colIndex / (colsInRow - 1)) * 68;

  return { left, top };
}
