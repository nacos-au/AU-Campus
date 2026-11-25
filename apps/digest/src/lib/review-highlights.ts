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

function findRange(
  root: HTMLElement,
  anchor: HighlightAnchor
): Range | null {
  const quote = anchor.quote?.trim();
  if (!quote) return null;

  const nodes = collectTextNodes(root);
  if (nodes.length === 0) return null;

  let full = "";
  const starts: number[] = [];
  for (const node of nodes) {
    starts.push(full.length);
    full += node.nodeValue ?? "";
  }

  const candidates: number[] = [];
  let from = 0;
  while (from <= full.length) {
    const i = full.indexOf(quote, from);
    if (i === -1) break;
    candidates.push(i);
    from = i + 1;
  }
  if (candidates.length === 0) return null;

  let pick = candidates[0];
  const prefix = anchor.prefix ?? "";
  const suffix = anchor.suffix ?? "";
  if (candidates.length > 1 && (prefix || suffix)) {
    const scored = candidates.map((i) => {
      let score = 0;
      if (prefix && full.slice(Math.max(0, i - prefix.length), i) === prefix) {
        score += 2;
      }
      if (
        suffix &&
        full.slice(i + quote.length, i + quote.length + suffix.length) === suffix
      ) {
        score += 2;
      }
      return { i, score };
    });
    scored.sort((a, b) => b.score - a.score);
    pick = scored[0].i;
  }

  const end = pick + quote.length;

  function pointAt(abs: number): { node: Text; offset: number } | null {
    for (let i = 0; i < nodes.length; i++) {
      const start = starts[i];
      const len = nodes[i].nodeValue?.length ?? 0;
      if (abs >= start && abs <= start + len) {
        return { node: nodes[i], offset: abs - start };
      }
    }
    return null;
  }

  const a = pointAt(pick);
  const b = pointAt(end);
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

function wrapRange(range: Range, spec: HighlightSpec) {
  if (spec.id === "pending") {
    const mark = document.createElement("mark");
    mark.dataset.reviewId = spec.id;
    mark.className = "bg-yellow-200";
    try {
      range.surroundContents(mark);
    } catch {
      const frag = range.extractContents();
      mark.appendChild(frag);
      range.insertNode(mark);
    }
    return;
  }

  const mark = document.createElement("mark");
  mark.dataset.reviewId = spec.id;
  mark.className = "bg-yellow-200";
  try {
    range.surroundContents(mark);
  } catch {
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.reviewIcon = "1";
  btn.dataset.reviewId = spec.id;
  btn.dataset.body = spec.body ?? "";
  btn.dataset.time = spec.timeLabel ?? "";
  btn.dataset.author = spec.authorLabel ?? "";
  btn.setAttribute("aria-label", "Review comment");
  btn.className =
    "ml-0.5 inline-flex h-4 w-4 translate-y-[-1px] items-center justify-center rounded-full bg-ink text-paper align-middle hover:bg-accent";
  /* Lucide MessageCircle path (DOM injection — no React tree here) */
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  mark.after(btn);
}

export function applyReviewHighlights(
  root: HTMLElement,
  specs: HighlightSpec[]
) {
  clearMarks(root);
  for (const spec of specs) {
    if (!spec.quote) continue;
    const range = findRange(root, spec);
    if (!range) continue;
    wrapRange(range, spec);
  }
}

export function scrollToReviewHighlight(root: HTMLElement, id: string) {
  const el = root.querySelector(`mark[data-review-id="${CSS.escape(id)}"]`);
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-yellow-500");
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-yellow-500");
    }, 1200);
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
