import { wordDiff, type DiffSeg } from "@/lib/textDiff";

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
};

export type FlatBlock = {
  kind: "text" | "image";
  tag: "p" | "h2" | "h3" | "li" | "blockquote";
  text: string;
  src?: string;
  alt?: string;
};

export type DiffBlock =
  | { op: "equal"; block: FlatBlock }
  | { op: "insert"; block: FlatBlock }
  | { op: "delete"; block: FlatBlock }
  | { op: "change"; block: FlatBlock; before: FlatBlock; segs: DiffSeg[] };

function inlineText(node: Node): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

function blockText(node: Node): string {
  // Paragraph-like children joined by newline (blockquote / list item).
  const kids = node.content ?? [];
  const hasBlocks = kids.some((k) =>
    ["paragraph", "heading", "bulletList", "orderedList", "blockquote"].includes(
      k.type ?? ""
    )
  );
  if (!hasBlocks) return inlineText(node);
  return kids.map(blockText).filter(Boolean).join("\n");
}

/** Flatten a Tiptap doc into a list of comparable blocks. */
export function flattenBlocks(doc: unknown): FlatBlock[] {
  const out: FlatBlock[] = [];
  const walk = (node: Node) => {
    switch (node.type) {
      case "paragraph": {
        const text = inlineText(node);
        if (text.trim()) out.push({ kind: "text", tag: "p", text });
        return;
      }
      case "heading": {
        const text = inlineText(node);
        const level = Number(node.attrs?.level ?? 2);
        if (text.trim()) {
          out.push({ kind: "text", tag: level <= 2 ? "h2" : "h3", text });
        }
        return;
      }
      case "blockquote": {
        const text = blockText(node);
        if (text.trim()) out.push({ kind: "text", tag: "blockquote", text });
        return;
      }
      case "listItem": {
        const text = blockText(node);
        if (text.trim()) out.push({ kind: "text", tag: "li", text });
        return;
      }
      case "image": {
        const src = String(node.attrs?.src ?? "");
        if (src) {
          out.push({
            kind: "image",
            tag: "p",
            text: "",
            src,
            alt: String(node.attrs?.alt ?? node.attrs?.title ?? ""),
          });
        }
        return;
      }
      default:
        node.content?.forEach(walk);
    }
  };
  if (doc && typeof doc === "object") walk(doc as Node);
  return out;
}

const keyOf = (b: FlatBlock) =>
  `${b.kind}|${b.tag}|${b.kind === "image" ? b.src : b.text}`;

function words(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []);
}

function similarity(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  A.forEach((w) => {
    if (B.has(w)) shared += 1;
  });
  return shared / (A.size + B.size - shared);
}

type Op = { op: "equal" | "insert" | "delete"; block: FlatBlock };

function lcsOps(a: FlatBlock[], b: FlatBlock[]): Op[] {
  const ka = a.map(keyOf);
  const kb = b.map(keyOf);
  const n = ka.length;
  const m = kb.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        ka[i] === kb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) {
      ops.push({ op: "equal", block: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ op: "delete", block: a[i++] });
    } else {
      ops.push({ op: "insert", block: b[j++] });
    }
  }
  while (i < n) ops.push({ op: "delete", block: a[i++] });
  while (j < m) ops.push({ op: "insert", block: b[j++] });
  return ops;
}

/** Block-level diff, with word-level changes inside blocks that were edited. */
export function diffBodies(before: unknown, after: unknown): DiffBlock[] {
  const ops = lcsOps(flattenBlocks(before), flattenBlocks(after));
  const out: DiffBlock[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === "equal") {
      out.push({ op: "equal", block: ops[k].block });
      k++;
      continue;
    }
    const dels: FlatBlock[] = [];
    const ins: FlatBlock[] = [];
    while (k < ops.length && ops[k].op !== "equal") {
      (ops[k].op === "delete" ? dels : ins).push(ops[k].block);
      k++;
    }
    let ii = 0;
    for (const d of dels) {
      let match = -1;
      if (d.kind === "text") {
        for (let j = ii; j < ins.length; j++) {
          if (ins[j].kind === "text" && similarity(d.text, ins[j].text) >= 0.3) {
            match = j;
            break;
          }
        }
      }
      if (match === -1) {
        out.push({ op: "delete", block: d });
        continue;
      }
      for (let j = ii; j < match; j++) out.push({ op: "insert", block: ins[j] });
      out.push({
        op: "change",
        block: ins[match],
        before: d,
        segs: wordDiff(d.text, ins[match].text),
      });
      ii = match + 1;
    }
    for (let j = ii; j < ins.length; j++) out.push({ op: "insert", block: ins[j] });
  }
  return out;
}

export function diffHasChanges(blocks: DiffBlock[]): boolean {
  return blocks.some((b) => b.op !== "equal");
}

export function diffSummary(blocks: DiffBlock[]): {
  added: number;
  removed: number;
  edited: number;
} {
  let added = 0;
  let removed = 0;
  let edited = 0;
  for (const b of blocks) {
    if (b.op === "insert") added += 1;
    else if (b.op === "delete") removed += 1;
    else if (b.op === "change") edited += 1;
  }
  return { added, removed, edited };
}
