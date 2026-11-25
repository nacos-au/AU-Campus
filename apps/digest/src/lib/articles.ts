/** Public list/detail select — includes author, co-authors, optional series. */
export const ARTICLE_PUBLIC_SELECT =
  "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username), article_series(id, slug, title), article_collaborators(user_id, credit_order, profiles(display_name, username))";

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
}

/** Adult silent-reading rate for English prose (words / minute). */
const PROSE_WPM = 238;
/** Code / dense monospace is scanned much more slowly. */
const CODE_WPM = 80;
/**
 * Seconds added per inline image, Medium-style: 12s, 11s, … floor 3s.
 * Covers the pause to look at a photo before returning to text.
 */
const IMAGE_SECONDS_START = 12;
const IMAGE_SECONDS_FLOOR = 3;

interface BodyStats {
  proseWords: number;
  codeWords: number;
  images: number;
}

/** Count words with Unicode letters/numbers (handles accents, not just ASCII). */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  const matches = text.match(/\p{L}[\p{L}\p{M}'’]*|\p{N}+/gu);
  return matches?.length ?? 0;
}

function collectStats(doc: unknown): BodyStats {
  const stats: BodyStats = { proseWords: 0, codeWords: 0, images: 0 };
  if (!doc || typeof doc !== "object") return stats;

  const walk = (node: TiptapNode, inCode: boolean) => {
    if (node.type === "image") {
      stats.images += 1;
      return;
    }

    const codeFence =
      inCode || node.type === "codeBlock" || node.type === "code";

    if (node.text) {
      const n = countWords(node.text);
      if (codeFence) stats.codeWords += n;
      else stats.proseWords += n;
    }

    node.content?.forEach((child) => walk(child, codeFence));
  };

  walk(doc as TiptapNode, false);
  return stats;
}

function imageSeconds(count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.max(IMAGE_SECONDS_START - i, IMAGE_SECONDS_FLOOR);
  }
  return total;
}

/**
 * Estimated reading time in whole minutes.
 * Uses researched English silent-reading WPM, slower code scanning, and
 * Medium-style image dwell — more accurate than a flat words÷200 guess.
 */
export function readingMinutes(
  doc: unknown,
  opts?: { extraImages?: number }
): number {
  const stats = collectStats(doc);
  const images = stats.images + Math.max(0, opts?.extraImages ?? 0);
  const proseMin = stats.proseWords / PROSE_WPM;
  const codeMin = stats.codeWords / CODE_WPM;
  const imageMin = imageSeconds(images) / 60;
  const total = proseMin + codeMin + imageMin;
  if (total <= 0) return 1;
  // Round half-up; never show 0 for a published body.
  return Math.max(1, Math.round(total));
}

/** Flatten a Tiptap JSON document to plain text. */
export function tiptapToText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (node: TiptapNode) => {
    if (node.type === "hardBreak") {
      parts.push("\n");
      return;
    }
    if (node.type === "image") return;
    if (node.text) parts.push(node.text);
    node.content?.forEach(walk);
    if (
      node.type === "paragraph" ||
      node.type === "heading" ||
      node.type === "blockquote" ||
      node.type === "listItem" ||
      node.type === "codeBlock"
    ) {
      parts.push("\n");
    }
  };
  if (doc && typeof doc === "object") walk(doc as TiptapNode);
  return parts.join(" ").replace(/[^\S\n]+/g, " ").replace(/\s+\n/g, "\n").trim();
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

/** Slugs created before a real headline existed. */
export function isPlaceholderSlug(slug: string | null | undefined): boolean {
  if (!slug) return true;
  return /^untitled-draft($|-)/i.test(slug);
}

/** Public-facing slug from title + short unique suffix. */
export function articleSlug(title: string, unique: string): string {
  const stem = slugify(title.trim()) || "story";
  const suffix = unique.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return `${stem}-${suffix || Date.now().toString(36)}`.slice(0, 96);
}
