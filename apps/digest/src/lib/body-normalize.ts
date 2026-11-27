/**
 * Tiptap bodies sometimes carry raw newline characters inside a paragraph's text
 * (pasted from Docs/Word/markdown). The editor shows those as line breaks, but
 * the public renderer collapses them. Normalizing turns them into real
 * paragraphs (blank line) and hard breaks (single newline) so edit and preview
 * always agree.
 */

export type DocNode = {
  type?: string;
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
  content?: DocNode[];
};

const SEP = /(\s*\n\s*)/;

function newlineCount(s: string): number {
  return (s.match(/\n/g) ?? []).length;
}

function hasStrayNewline(kids: DocNode[]): boolean {
  return kids.some((k) => k.type === "text" && !!k.text && k.text.includes("\n"));
}

function trimEdges(kids: DocNode[]): DocNode[] {
  const out = kids.map((k) => ({ ...k }));
  while (out.length && out[0].type === "hardBreak") out.shift();
  while (out.length && out[out.length - 1].type === "hardBreak") out.pop();
  const first = out[0];
  if (first?.type === "text" && first.text) first.text = first.text.trimStart();
  const last = out[out.length - 1];
  if (last?.type === "text" && last.text) last.text = last.text.trimEnd();
  return out.filter((k) => !(k.type === "text" && !k.text));
}

function splitInline(kids: DocNode[], inHeading: boolean): DocNode[][] {
  const paras: DocNode[][] = [[]];
  const cur = () => paras[paras.length - 1];
  for (const child of kids) {
    if (child.type !== "text" || !child.text || !child.text.includes("\n")) {
      cur().push(child);
      continue;
    }
    const text = child.text.replace(/\r\n?/g, "\n");
    const parts = text.split(SEP);
    parts.forEach((part, i) => {
      if (i % 2 === 0) {
        if (part) cur().push({ ...child, text: part });
        return;
      }
      if (newlineCount(part) >= 2) {
        paras.push([]);
      } else if (inHeading) {
        cur().push({ ...child, text: " " });
      } else {
        cur().push({ type: "hardBreak" });
      }
    });
  }
  return paras;
}

function normalizeNode(node: DocNode): DocNode[] {
  if (node.type === "paragraph" || node.type === "heading") {
    const kids = node.content ?? [];
    if (!hasStrayNewline(kids)) return [node];
    const paras = splitInline(kids, node.type === "heading")
      .map(trimEdges)
      .filter((p) => p.length > 0);
    if (paras.length === 0) return [];
    return paras.map((content) => ({ ...node, content }));
  }
  if (node.content) {
    let content = node.content.flatMap(normalizeNode);
    if (content.length === 0 && node.type && node.type !== "doc") {
      content = [{ type: "paragraph" }];
    }
    return [{ ...node, content }];
  }
  return [node];
}

/** Returns a cleaned copy; the input is left untouched. */
export function normalizeBodyDoc<T>(doc: T): T {
  if (!doc || typeof doc !== "object") return doc;
  const root = doc as DocNode;
  if (root.type !== "doc") return doc;
  const [next] = normalizeNode(root);
  return (next ?? root) as unknown as T;
}

/** True when the doc still has raw newlines inside paragraph text. */
export function bodyHasStrayNewlines(doc: unknown): boolean {
  let found = false;
  const walk = (n: DocNode) => {
    if (found) return;
    if (n.type === "text" && n.text?.includes("\n")) {
      found = true;
      return;
    }
    n.content?.forEach(walk);
  };
  if (doc && typeof doc === "object") walk(doc as DocNode);
  return found;
}
