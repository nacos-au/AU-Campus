/** Public list/detail select — includes author, co-authors, optional series. */
export const ARTICLE_PUBLIC_SELECT =
  "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username), article_series(id, slug, title), article_collaborators(user_id, credit_order, profiles(display_name, username))";

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
}

/** Flatten a Tiptap JSON document to plain text. */
export function tiptapToText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (node: TiptapNode) => {
    if (node.text) parts.push(node.text);
    node.content?.forEach(walk);
    if (node.type === "paragraph") parts.push("\n");
  };
  if (doc && typeof doc === "object") walk(doc as TiptapNode);
  return parts.join(" ").replace(/\s+\n/g, "\n").trim();
}

export function readingMinutes(doc: unknown): number {
  const words = tiptapToText(doc).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function excerpt(doc: unknown, maxLen = 180): string {
  const text = tiptapToText(doc).replace(/\n/g, " ");
  return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
