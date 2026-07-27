/** Horizontal spread for N players in a row (% from left). */
const ROW_LEFT: Record<number, number[]> = {
  1: [50],
  2: [28, 72],
  3: [18, 50, 82],
  4: [12, 34, 66, 88],
  5: [8, 28, 50, 72, 92],
};

/** Wider spread for front-three lines. */
const ROW_LEFT_WIDE: Record<number, number[]> = {
  3: [10, 50, 90],
};

export function parseFormation(formation: string): number[] {
  return formation
    .split("-")
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
}

export function formationRowCount(formation: string): number {
  return 1 + parseFormation(formation).length;
}

function horizontalPosition(
  colIndex: number,
  colsInRow: number,
  rowIndex: number,
  totalRows: number
): number {
  const isFrontLine = rowIndex === totalRows - 1 && colsInRow === 3;
  const map = isFrontLine ? ROW_LEFT_WIDE[colsInRow] ?? ROW_LEFT[colsInRow] : ROW_LEFT[colsInRow];
  return map?.[colIndex] ?? 50;
}

/** Vertical row positions on full pitch (% from top) for GK + outfield lines. */
const HOME_ROW_TOPS: Record<number, number[]> = {
  4: [3, 16, 28, 41],
};

const AWAY_ROW_TOPS: Record<number, number[]> = {
  4: [97, 84, 72, 59],
};

/**
 * Vertical position on full pitch (% from top).
 * Row 0 is always GK on its own line; row 1+ are outfield lines from formation string.
 */
function verticalPositionFullPitch(
  side: "home" | "away",
  rowIndex: number,
  totalRows: number
): number {
  const preset = side === "home" ? HOME_ROW_TOPS[totalRows] : AWAY_ROW_TOPS[totalRows];
  if (preset?.[rowIndex] !== undefined) return preset[rowIndex];

  const rowGap = 16.4;
  const homeGk = 3;
  const homeAttack = 41;
  const awayGk = 97;
  const awayAttack = 59;

  if (side === "home") {
    if (rowIndex === 0) return homeGk;
    return Math.min(homeAttack, homeGk + rowIndex * rowGap);
  }

  if (rowIndex === 0) return awayGk;
  return Math.max(awayAttack, awayGk - rowIndex * rowGap);
}

export function formationSlotPosition(
  side: "home" | "away",
  rowIndex: number,
  colIndex: number,
  colsInRow: number,
  totalRows: number,
  formation = "4-3-3",
  fullPitch = false
): { left: number; top: number } {
  const left = horizontalPosition(colIndex, colsInRow, rowIndex, totalRows);

  if (fullPitch) {
    return { left, top: verticalPositionFullPitch(side, rowIndex, totalRows) };
  }

  const outfieldRows = totalRows - 1;
  const rowProgress = rowIndex === 0 ? 0 : rowIndex / outfieldRows;

  if (side === "home") {
    const top = rowIndex === 0 ? 8 : 12 + rowProgress * 58;
    return { left, top };
  }

  const top = rowIndex === 0 ? 92 : 88 - rowProgress * 58;
  return { left, top };
}

export function validateFormationRows(formation: string, rows: { length: number }[]): boolean {
  const expected = parseFormation(formation);
  if (rows.length !== expected.length + 1) return false;
  if (rows[0]?.length !== 1) return false;
  for (let i = 0; i < expected.length; i++) {
    if (rows[i + 1]?.length !== expected[i]) return false;
  }
  return true;
}
