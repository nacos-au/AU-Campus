/** Minimal word-level diff (no dependency). Returns ordered segments. */

export type DiffSeg = { type: "equal" | "add" | "del"; text: string };

function tokenize(s: string): string[] {
  return s.match(/\S+\s*|\s+/g) ?? [];
}

/** Myers-ish LCS on tokens — fine for article-length copy. */
export function wordDiff(a: string, b: string): DiffSeg[] {
  const A = tokenize(a);
  const B = tokenize(b);
  const n = A.length;
  const m = B.length;
  if (n === 0 && m === 0) return [];
  if (n === 0) return [{ type: "add", text: b }];
  if (m === 0) return [{ type: "del", text: a }];

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0)
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        A[i - 1] === B[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const raw: DiffSeg[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
      raw.push({ type: "equal", text: A[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: "add", text: B[j - 1] });
      j--;
    } else {
      raw.push({ type: "del", text: A[i - 1] });
      i--;
    }
  }
  raw.reverse();

  // Merge adjacent same-type segments
  const out: DiffSeg[] = [];
  for (const seg of raw) {
    const last = out[out.length - 1];
    if (last && last.type === seg.type) last.text += seg.text;
    else out.push({ ...seg });
  }
  return out;
}

export function hasDiffChanges(segs: DiffSeg[]): boolean {
  return segs.some((s) => s.type !== "equal");
}
