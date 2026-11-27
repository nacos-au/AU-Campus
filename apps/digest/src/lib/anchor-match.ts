import type { Node as PMNode } from "@tiptap/pm/model";
import {
  collapseWs,
  findCandidates,
  pickCandidate,
  type HighlightAnchor,
  type HighlightSpec,
} from "@/lib/review-highlights";

type Seg = { start: number; pos: number; len: number };

/** Same basis review comments were captured on: concatenated text nodes. */
function buildIndex(doc: PMNode): { full: string; segs: Seg[] } {
  const segs: Seg[] = [];
  let full = "";
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segs.push({ start: full.length, pos, len: node.text.length });
      full += node.text;
    }
    return true;
  });
  return { full, segs };
}

function toPos(segs: Seg[], abs: number, isEnd: boolean): number | null {
  for (const s of segs) {
    const hit = isEnd
      ? abs > s.start && abs <= s.start + s.len
      : abs >= s.start && abs < s.start + s.len;
    if (hit) return s.pos + (abs - s.start);
  }
  return null;
}

function findOffsets(
  full: string,
  anchor: HighlightAnchor
): [number, number] | null {
  const quote = anchor.quote?.trim();
  if (!quote) return null;
  const prefix = anchor.prefix ?? "";
  const suffix = anchor.suffix ?? "";

  const exact = findCandidates(full, quote);
  if (exact.length > 0) {
    const i = pickCandidate(full, exact, quote.length, prefix, suffix);
    return [i, i + quote.length];
  }

  const { norm: fullNorm, toOrig } = collapseWs(full);
  const { norm: quoteNorm } = collapseWs(quote);
  if (!quoteNorm) return null;
  const cands = findCandidates(fullNorm, quoteNorm);
  if (cands.length === 0) return null;
  const { norm: pn } = collapseWs(prefix);
  const { norm: sn } = collapseWs(suffix);
  const pick = pickCandidate(fullNorm, cands, quoteNorm.length, pn, sn);
  const a = toOrig[pick];
  const b = toOrig[pick + quoteNorm.length - 1];
  if (a == null || b == null) return null;
  return [a, b + 1];
}

export type AnchorRange = { id: string; from: number; to: number };

/** Locate each spec in the live doc; specs that no longer match are "missed". */
export function matchAnchors(
  doc: PMNode,
  specs: HighlightSpec[]
): { ranges: AnchorRange[]; missed: string[] } {
  const { full, segs } = buildIndex(doc);
  const ranges: AnchorRange[] = [];
  const missed: string[] = [];
  for (const spec of specs) {
    if (!spec.quote) continue;
    const offsets = full ? findOffsets(full, spec) : null;
    const from = offsets ? toPos(segs, offsets[0], false) : null;
    const to = offsets ? toPos(segs, offsets[1], true) : null;
    if (from == null || to == null || to <= from) {
      if (spec.id !== "pending") missed.push(spec.id);
      continue;
    }
    ranges.push({ id: spec.id, from, to });
  }
  return { ranges, missed };
}
