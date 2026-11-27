/**
 * Turns plain text copied from an IDE or a markdown draft into body blocks.
 * Every non-empty line is its own block so each one can be restyled on its
 * own; a small subset of markdown (headings, lists, quotes, rules, bold,
 * italic, code, links) is understood.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };

export type MdNode = {
  type: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: MdNode[];
};

const INLINE =
  /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|(?<![\w*])\*[^*\s][^*\n]*?\*(?![\w*])|(?<![\w_])_[^_\s][^_\n]*?_(?![\w_]))/;

function withMark(nodes: MdNode[], mark: Mark): MdNode[] {
  return nodes.map((n) =>
    n.type === "text" ? { ...n, marks: [...(n.marks ?? []), mark] } : n
  );
}

export function parseInline(text: string): MdNode[] {
  const out: MdNode[] = [];
  const parts = text.split(INLINE);
  parts.forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 0) {
      out.push({ type: "text", text: part });
      return;
    }
    if (part.startsWith("**") || part.startsWith("__")) {
      out.push(...withMark(parseInline(part.slice(2, -2)), { type: "bold" }));
    } else if (part.startsWith("`")) {
      out.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "code" }] });
    } else if (part.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (m) {
        out.push(
          ...withMark(parseInline(m[1]), { type: "link", attrs: { href: m[2] } })
        );
      } else {
        out.push({ type: "text", text: part });
      }
    } else {
      out.push(...withMark(parseInline(part.slice(1, -1)), { type: "italic" }));
    }
  });
  return out;
}

function paragraph(text: string): MdNode {
  const content = parseInline(text.trim());
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^[-*+]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;

export function markdownToDoc(text: string): MdNode[] {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.trim());
  const blocks: MdNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ type: "horizontalRule" });
      i++;
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      const content = parseInline(h[2].replace(/\s+#+$/, "").trim());
      if (content.length) {
        blocks.push({
          type: "heading",
          attrs: { level: h[1].length <= 2 ? 2 : 3 },
          content,
        });
      }
      i++;
      continue;
    }
    const listKind = BULLET.test(line)
      ? "bulletList"
      : ORDERED.test(line)
        ? "orderedList"
        : null;
    if (listKind) {
      const re = listKind === "bulletList" ? BULLET : ORDERED;
      const items: MdNode[] = [];
      let m: RegExpExecArray | null;
      while (i < lines.length && (m = re.exec(lines[i]))) {
        items.push({ type: "listItem", content: [paragraph(m[1])] });
        i++;
      }
      blocks.push({ type: listKind, content: items });
      continue;
    }
    if (QUOTE.test(line)) {
      const paras: MdNode[] = [];
      let m: RegExpExecArray | null;
      while (i < lines.length && (m = QUOTE.exec(lines[i]))) {
        if (m[1].trim()) paras.push(paragraph(m[1]));
        i++;
      }
      if (paras.length) blocks.push({ type: "blockquote", content: paras });
      continue;
    }
    blocks.push(paragraph(line));
    i++;
  }
  return blocks;
}
