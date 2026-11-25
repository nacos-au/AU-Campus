import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

const COVERS_MARKER = "/storage/v1/object/public/covers/";
const SKIP_UNDER_BYTES = 400 * 1024;
const MAX_WIDTH = 1280;
const WEBP_QUALITY = 75;

export type ReoptimizeBatchResult = {
  scanned: number;
  updated: number;
  skipped: number;
  imagesRewritten: number;
  errors: string[];
  moreRemaining: boolean;
};

type TipTapNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
};

function coversObjectPath(url: string): string | null {
  const i = url.indexOf(COVERS_MARKER);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + COVERS_MARKER.length).split("?")[0]);
}

async function remoteByteSize(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) {
      const len = head.headers.get("content-length");
      if (len) return Number(len);
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function encodeOptimized(
  input: Buffer
): Promise<{ buffer: Buffer; contentType: string; ext: string } | null> {
  const image = sharp(input, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const pipeline =
    width > MAX_WIDTH ? image.resize({ width: MAX_WIDTH, withoutEnlargement: true }) : image;

  try {
    const buffer = await pipeline
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    return { buffer, contentType: "image/webp", ext: "webp" };
  } catch {
    const buffer = await pipeline.jpeg({ quality: WEBP_QUALITY, mozjpeg: true }).toBuffer();
    return { buffer, contentType: "image/jpeg", ext: "jpg" };
  }
}

async function rewriteStoredImage(
  supabase: SupabaseClient,
  url: string,
  nameHint: string
): Promise<{ url: string; changed: boolean } | null> {
  if (!coversObjectPath(url)) return null;

  const size = await remoteByteSize(url);
  if (size != null && size < SKIP_UNDER_BYTES) {
    return { url, changed: false };
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);
  const input = Buffer.from(await res.arrayBuffer());
  if (input.byteLength < SKIP_UNDER_BYTES) {
    return { url, changed: false };
  }

  const encoded = await encodeOptimized(input);
  if (!encoded) return { url, changed: false };
  // Don't replace if we didn't actually shrink meaningfully.
  if (encoded.buffer.byteLength >= input.byteLength * 0.95) {
    return { url, changed: false };
  }

  const hint = nameHint
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const path = `articles/${hint || "story"}-reopt-${crypto.randomUUID()}.${encoded.ext}`;
  const { error } = await supabase.storage.from("covers").upload(path, encoded.buffer, {
    contentType: encoded.contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const next = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
  return { url: next, changed: true };
}

function walkBodyImages(
  node: TipTapNode,
  visit: (n: TipTapNode) => void
): void {
  if (node.type === "image") visit(node);
  for (const child of node.content ?? []) walkBodyImages(child, visit);
}

async function reoptimizeArticle(
  supabase: SupabaseClient,
  article: { id: string; title: string; cover_url: string | null; body: unknown }
): Promise<{ changed: boolean; images: number }> {
  let images = 0;
  let coverUrl = article.cover_url;
  let bodyChanged = false;
  const hint = article.title || article.id;

  if (coverUrl?.trim()) {
    const result = await rewriteStoredImage(supabase, coverUrl, hint);
    if (result?.changed) {
      coverUrl = result.url;
      images += 1;
    }
  }

  let body = article.body;
  if (body && typeof body === "object") {
    const clone = structuredClone(body) as TipTapNode;
    const jobs: Array<() => Promise<void>> = [];
    walkBodyImages(clone, (n) => {
      const src = String(n.attrs?.src ?? "");
      if (!src || !coversObjectPath(src)) return;
      jobs.push(async () => {
        const result = await rewriteStoredImage(supabase, src, hint);
        if (result?.changed && n.attrs) {
          n.attrs.src = result.url;
          bodyChanged = true;
          images += 1;
        }
      });
    });
    // Sequential to stay gentle on storage / free quotas.
    for (const job of jobs) await job();
    if (bodyChanged) body = clone;
  }

  const coverChanged = coverUrl !== article.cover_url;
  if (!coverChanged && !bodyChanged) {
    return { changed: false, images: 0 };
  }

  const patch: Record<string, unknown> = {};
  if (coverChanged) patch.cover_url = coverUrl;
  if (bodyChanged) patch.body = body;
  const { error } = await supabase.from("articles").update(patch).eq("id", article.id);
  if (error) throw new Error(error.message);
  return { changed: true, images };
}

/**
 * Re-encode oversized cover + body images for a small batch of articles.
 * Pass increasing `offset` from the client until `moreRemaining` is false.
 */
export async function reoptimizeArticleImagesBatch(
  supabase: SupabaseClient,
  opts?: { limit?: number; offset?: number }
): Promise<ReoptimizeBatchResult> {
  const limit = Math.min(Math.max(opts?.limit ?? 5, 1), 10);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, cover_url, body")
    .not("cover_url", "is", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: string;
    title: string;
    cover_url: string | null;
    body: unknown;
  }>;

  const result: ReoptimizeBatchResult = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    imagesRewritten: 0,
    errors: [],
    moreRemaining: rows.length === limit,
  };

  for (const row of rows) {
    result.scanned += 1;
    try {
      const out = await reoptimizeArticle(supabase, row);
      if (out.changed) {
        result.updated += 1;
        result.imagesRewritten += out.images;
      } else {
        result.skipped += 1;
      }
    } catch (e) {
      result.errors.push(
        `${row.title || row.id}: ${(e as Error).message || "failed"}`
      );
      result.skipped += 1;
    }
  }

  return result;
}
