/** DOM helpers for review quote highlights (book-style marks). */

export type HighlightAnchor = {
  quote: string;
  prefix?: string | null;
  suffix?: string | null;
};

export type HighlightSpec = HighlightAnchor & {
  id: string;
  /** Shown in hover popover */
  body?: string;
  timeLabel?: string;
  authorLabel?: string;
};

export type ApplyHighlightsResult = {
  painted: string[];
  missed: string[];
};

function clearMarks(root: HTMLElement) {
  root.querySelectorAll("button[data-review-icon]").forEach((b) => b.remove());
  root.querySelectorAll("mark[data-review-id]").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  });
  root.querySelectorAll("mark[data-review]").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  });
  root.normalize();
}

function collectTextNodes(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n.nodeValue && n.nodeValue.length) out.push(n as Text);
  }
  return out;
}

/** Concatenated text-node content (same basis as highlight matching). */
export function plainTextFromRoot(root: HTMLElement): string {
  return collectTextNodes(root)
    .map((n) => n.nodeValue ?? "")
    .join("");
}

type TextIndex = {
  full: string;
  nodes: Text[];
  starts: number[];
};

function buildIndex(root: HTMLElement): TextIndex {
  const nodes = collectTextNodes(root);
  let full = "";
  const starts: number[] = [];
  for (const node of nodes) {
    starts.push(full.length);
    full += node.nodeValue ?? "";
  }
  return { full, nodes, starts };
}

function pointAt(
  index: TextIndex,
  abs: number
): { node: Text; offset: number } | null {
  const { nodes, starts } = index;
  for (let i = 0; i < nodes.length; i++) {
    const start = starts[i];
    const len = nodes[i].nodeValue?.length ?? 0;
    if (abs >= start && abs <= start + len) {
      return { node: nodes[i], offset: abs - start };
    }
  }
  return null;
}

function rangeFromOffsets(
  index: TextIndex,
  start: number,
  end: number
): Range | null {
  const a = pointAt(index, start);
  const b = pointAt(index, end);
  if (!a || !b) return null;
  try {
    const range = document.createRange();
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, b.offset);
    return range;
  } catch {
    return null;
  }
}

/** Map each char in whitespace-collapsed string back to original index. */
function collapseWs(s: string): { norm: string; toOrig: number[] } {
  let norm = "";
  const toOrig: number[] = [];
  let sawSpace = true;
  for (let i = 0; i < s.length; i++) {
    if (/\s/.test(s[i]!)) {
      if (!sawSpace && norm.length > 0) {
        norm += " ";
        toOrig.push(i);
        sawSpace = true;
      }
    } else {
      norm += s[i];
      toOrig.push(i);
      sawSpace = false;
    }
  }
  if (norm.endsWith(" ")) {
    norm = norm.slice(0, -1);
    toOrig.pop();
  }
  return { norm, toOrig };
}

function findCandidates(haystack: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  let from = 0;
  while (from <= haystack.length) {
    const i = haystack.indexOf(needle, from);
    if (i === -1) break;
    out.push(i);
    from = i + 1;
  }
  return out;
}

function pickCandidate(
  full: string,
  candidates: number[],
  quoteLen: number,
  prefix: string,
  suffix: string
): number {
  if (candidates.length === 1 || (!prefix && !suffix)) return candidates[0]!;
  const scored = candidates.map((i) => {
    let score = 0;
    if (prefix && full.slice(Math.max(0, i - prefix.length), i) === prefix) {
      score += 2;
    }
    if (
      suffix &&
      full.slice(i + quoteLen, i + quoteLen + suffix.length) === suffix
    ) {
      score += 2;
    }
    return { i, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.i;
}

function findRange(root: HTMLElement, anchor: HighlightAnchor): Range | null {
  const quoteRaw = anchor.quote?.trim();
  if (!quoteRaw) return null;

  const index = buildIndex(root);
  if (!index.full) return null;

  const prefix = anchor.prefix ?? "";
  const suffix = anchor.suffix ?? "";

  // Exact match on text-node concatenation
  let candidates = findCandidates(index.full, quoteRaw);
  if (candidates.length > 0) {
    const pick = pickCandidate(
      index.full,
      candidates,
      quoteRaw.length,
      prefix,
      suffix
    );
    return rangeFromOffsets(index, pick, pick + quoteRaw.length);
  }

  // Selection.toString() often inserts newlines between blocks; our index does not.
  const quoteNoBreak = quoteRaw.replace(/\s+/g, "");
  const fullNoBreak = index.full.replace(/\s+/g, "");
  if (quoteNoBreak.length > 0) {
    const { norm: _fn, toOrig: fullMap } = (() => {
      // Map no-break index → original
      const toOrig: number[] = [];
      for (let i = 0; i < index.full.length; i++) {
        if (!/\s/.test(index.full[i]!)) toOrig.push(i);
      }
      return { norm: fullNoBreak, toOrig };
    })();
    const nbCandidates = findCandidates(fullNoBreak, quoteNoBreak);
    if (nbCandidates.length > 0 && fullMap.length === fullNoBreak.length) {
      const pickNb = nbCandidates[0]!;
      const startOrig = fullMap[pickNb];
      const endOrig = fullMap[pickNb + quoteNoBreak.length - 1];
      if (startOrig != null && endOrig != null) {
        return rangeFromOffsets(index, startOrig, endOrig + 1);
      }
    }
  }

  // Whitespace-collapsed match (prefix/suffix also collapsed)
  const { norm: fullNorm, toOrig } = collapseWs(index.full);
  const { norm: quoteNorm } = collapseWs(quoteRaw);
  if (!quoteNorm) return null;
  candidates = findCandidates(fullNorm, quoteNorm);
  if (candidates.length === 0) return null;

  const { norm: prefixNorm } = collapseWs(prefix);
  const { norm: suffixNorm } = collapseWs(suffix);
  const pickNorm = pickCandidate(
    fullNorm,
    candidates,
    quoteNorm.length,
    prefixNorm,
    suffixNorm
  );
  const startOrig = toOrig[pickNorm];
  const endOrig = toOrig[pickNorm + quoteNorm.length - 1];
  if (startOrig == null || endOrig == null) return null;
  return rangeFromOffsets(index, startOrig, endOrig + 1);
}

/**
 * Absolute offset into plainTextFromRoot for a DOM point inside root.
 * Uses a probe range from the start of `root` to the point, then maps via
 * text-node index (same basis as findRange).
 */
function domPointToOffset(
  root: HTMLElement,
  index: TextIndex,
  container: Node,
  offset: number
): number | null {
  if (!root.contains(container) && container !== root) return null;

  if (container.nodeType === Node.TEXT_NODE) {
    const i = index.nodes.indexOf(container as Text);
    if (i === -1) return null;
    const len = container.nodeValue?.length ?? 0;
    return index.starts[i]! + Math.max(0, Math.min(offset, len));
  }

  // Resolve element+childIndex to a text node + offset (start of that child,
  // or end of last text inside container when past the last child).
  let textNode: Text | null = null;
  let textOffset = 0;

  if (offset < container.childNodes.length) {
    const child = container.childNodes[offset]!;
    if (child.nodeType === Node.TEXT_NODE) {
      textNode = child as Text;
      textOffset = 0;
    } else {
      const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
      textNode = walker.nextNode() as Text | null;
      textOffset = 0;
      if (!textNode) {
        // Empty child — take the next text node after it in root
        const after = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = after.nextNode())) {
          if (
            child.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING
          ) {
            textNode = n as Text;
            textOffset = 0;
            break;
          }
        }
        if (!textNode) return index.full.length;
      }
    }
  } else {
    // After last child — end of text inside container
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    let n: Node | null;
    while ((n = walker.nextNode())) last = n as Text;
    if (last) {
      textNode = last;
      textOffset = last.nodeValue?.length ?? 0;
    } else {
      // No text in container: next text after container, or EOF
      const after = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n2: Node | null;
      while ((n2 = after.nextNode())) {
        if (
          container.compareDocumentPosition(n2) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ) {
          textNode = n2 as Text;
          textOffset = 0;
          break;
        }
      }
      if (!textNode) return index.full.length;
    }
  }

  const i = index.nodes.indexOf(textNode);
  if (i === -1) return null;
  return index.starts[i]! + textOffset;
}

/**
 * Build an anchor from the current selection using the same plain-text basis
 * as highlight matching (avoids innerText vs text-node drift).
 */
export function captureAnchorFromSelection(
  root: HTMLElement
): HighlightAnchor | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const index = buildIndex(root);
  if (!index.full) return null;

  let start = domPointToOffset(
    root,
    index,
    range.startContainer,
    range.startOffset
  );
  let end = domPointToOffset(root, index, range.endContainer, range.endOffset);
  if (start == null || end == null) return null;
  if (end < start) [start, end] = [end, start];
  if (end <= start) return null;

  let quote = index.full.slice(start, end);
  const lead = quote.match(/^\s*/)?.[0]?.length ?? 0;
  const trail = quote.match(/\s*$/)?.[0]?.length ?? 0;
  start += lead;
  end -= trail;
  quote = index.full.slice(start, end);
  if (!quote || quote.length > 400) return null;

  return {
    quote,
    prefix: index.full.slice(Math.max(0, start - 24), start) || null,
    suffix: index.full.slice(end, end + 24) || null,
  };
}

function wrapRange(range: Range, spec: HighlightSpec) {
  const mark = document.createElement("mark");
  mark.dataset.reviewId = spec.id;
  mark.className =
    spec.id === "pending" ? "review-mark review-mark--pending" : "review-mark";
  try {
    range.surroundContents(mark);
  } catch {
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }

  if (spec.id === "pending") return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.reviewIcon = "1";
  btn.dataset.reviewId = spec.id;
  btn.dataset.body = spec.body ?? "";
  btn.dataset.time = spec.timeLabel ?? "";
  btn.dataset.author = spec.authorLabel ?? "";
  btn.setAttribute("aria-label", "Open review comment");
  btn.className = "review-mark-icon";
  /* Lucide MessageCircle path (DOM injection — no React tree here) */
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  // Icon at the end of the highlighted span
  mark.after(btn);
}

export function applyReviewHighlights(
  root: HTMLElement,
  specs: HighlightSpec[]
): ApplyHighlightsResult {
  clearMarks(root);
  const painted: string[] = [];
  const missed: string[] = [];
  for (const spec of specs) {
    if (!spec.quote) continue;
    const range = findRange(root, spec);
    if (!range) {
      if (spec.id !== "pending") missed.push(spec.id);
      continue;
    }
    wrapRange(range, spec);
    painted.push(spec.id);
  }
  return { painted, missed };
}

export function scrollToReviewHighlight(root: HTMLElement, id: string) {
  const el = root.querySelector(`mark[data-review-id="${CSS.escape(id)}"]`);
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("review-mark--active");
    window.setTimeout(() => {
      el.classList.remove("review-mark--active");
    }, 1400);
  }
}

export function formatReviewTimestamp(iso: string): {
  relative: string;
  absolute: string;
} {
  const d = new Date(iso);
  const absolute = d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  let relative: string;
  if (mins < 1) relative = "Just now";
  else if (mins < 60) relative = `${mins} min ago`;
  else if (mins < 60 * 24) relative = `${Math.floor(mins / 60)} hr ago`;
  else relative = `${Math.floor(mins / (60 * 24))} d ago`;
  return { relative, absolute };
}
