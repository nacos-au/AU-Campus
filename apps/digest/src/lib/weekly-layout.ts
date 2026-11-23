import type { ArticleWithMeta, WeeklyIssueSlot } from "@/lib/types";

export type WeeklySpan = 12 | 8 | 6 | 4;

export type WeeklyBlock =
  | {
      id: string;
      type: "intro";
      span: 12 | 8 | 6;
      byline?: string;
      body: string;
    }
  | {
      id: string;
      type: "heading";
      span: 12 | 6;
      text: string;
    }
  | {
      id: string;
      type: "text";
      span: 12 | 8 | 6;
      body: string;
    }
  | {
      id: string;
      type: "article";
      span: 12 | 8 | 6 | 4;
      articleId: string;
      teaser?: string;
      showImage?: boolean;
    }
  | {
      id: string;
      type: "articleStack";
      span: 4 | 6;
      articleIds: string[];
      title?: string;
    }
  | {
      id: string;
      type: "image";
      span: 12 | 6;
      url: string;
      caption?: string;
    }
  | { id: string; type: "divider"; span: 12 }
  | { id: string; type: "spacer"; span: 12; size: "sm" | "md" | "lg" };

export type WeeklyLayout = {
  version: 1;
  blocks: WeeklyBlock[];
  meta?: { sample?: boolean };
};

export const EMPTY_LAYOUT: WeeklyLayout = {
  version: 1,
  blocks: [],
  meta: {},
};

export function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseLayout(raw: unknown): WeeklyLayout {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LAYOUT, blocks: [] };
  const o = raw as Partial<WeeklyLayout>;
  const blocks = Array.isArray(o.blocks) ? (o.blocks as WeeklyBlock[]) : [];
  return {
    version: 1,
    blocks,
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}

export function isSampleLayout(layout: WeeklyLayout): boolean {
  return Boolean(layout.meta?.sample);
}

export function articleIdsInLayout(layout: WeeklyLayout): string[] {
  const ids: string[] = [];
  for (const b of layout.blocks) {
    if (b.type === "article" && b.articleId) ids.push(b.articleId);
    if (b.type === "articleStack") ids.push(...b.articleIds.filter(Boolean));
  }
  return [...new Set(ids)];
}

export function createBlock(
  type: WeeklyBlock["type"],
  partial?: Partial<WeeklyBlock>
): WeeklyBlock {
  const id = newBlockId();
  switch (type) {
    case "intro":
      return {
        id,
        type: "intro",
        span: 8,
        byline: "From the Desk",
        body: "",
        ...(partial as Partial<Extract<WeeklyBlock, { type: "intro" }>>),
      };
    case "heading":
      return {
        id,
        type: "heading",
        span: 12,
        text: "Headline",
        ...(partial as Partial<Extract<WeeklyBlock, { type: "heading" }>>),
      };
    case "text":
      return {
        id,
        type: "text",
        span: 12,
        body: "",
        ...(partial as Partial<Extract<WeeklyBlock, { type: "text" }>>),
      };
    case "article":
      return {
        id,
        type: "article",
        span: 8,
        articleId: "",
        showImage: true,
        ...(partial as Partial<Extract<WeeklyBlock, { type: "article" }>>),
      };
    case "articleStack":
      return {
        id,
        type: "articleStack",
        span: 4,
        articleIds: [],
        title: "Also",
        ...(partial as Partial<Extract<WeeklyBlock, { type: "articleStack" }>>),
      };
    case "image":
      return {
        id,
        type: "image",
        span: 6,
        url: "",
        caption: "",
        ...(partial as Partial<Extract<WeeklyBlock, { type: "image" }>>),
      };
    case "divider":
      return { id, type: "divider", span: 12 };
    case "spacer":
      return { id, type: "spacer", span: 12, size: "md" };
  }
}

export function spanClass(span: number): string {
  switch (span) {
    case 4:
      return "col-span-12 md:col-span-4";
    case 6:
      return "col-span-12 md:col-span-6";
    case 8:
      return "col-span-12 md:col-span-8";
    case 12:
    default:
      return "col-span-12";
  }
}

type LegacySlot = WeeklyIssueSlot & {
  articles?: ArticleWithMeta | null;
};

/** Map old lead/second/rail/inside slots into a freeform layout once. */
export function layoutFromLegacySlots(opts: {
  intro?: string | null;
  introByline?: string | null;
  slots: LegacySlot[];
  sectionName?: (id: number) => string;
}): WeeklyLayout {
  const blocks: WeeklyBlock[] = [];
  const intro = opts.intro?.trim();
  if (intro) {
    blocks.push({
      id: newBlockId(),
      type: "intro",
      span: 8,
      byline: opts.introByline?.trim() || "From the Desk",
      body: intro,
    });
  }

  const sorted = [...opts.slots].sort((a, b) => a.position - b.position);
  const lead = sorted.find((s) => s.slot === "lead");
  const second = sorted.find((s) => s.slot === "second");
  if (lead?.article_id) {
    blocks.push({
      id: newBlockId(),
      type: "article",
      span: 8,
      articleId: lead.article_id,
      teaser: lead.teaser ?? undefined,
      showImage: true,
    });
  }
  if (second?.article_id) {
    blocks.push({
      id: newBlockId(),
      type: "article",
      span: 4,
      articleId: second.article_id,
      teaser: second.teaser ?? undefined,
      showImage: true,
    });
  }

  const railIds = sorted
    .filter((s) => s.slot === "rail" && s.article_id)
    .map((s) => s.article_id);
  if (railIds.length) {
    blocks.push({
      id: newBlockId(),
      type: "articleStack",
      span: 4,
      articleIds: railIds,
      title: "The Rail",
    });
  }

  const inside = sorted.filter((s) => s.slot === "inside" && s.article_id);
  const bySection = new Map<number, LegacySlot[]>();
  for (const s of inside) {
    if (s.section_id == null) continue;
    const list = bySection.get(s.section_id) ?? [];
    list.push(s);
    bySection.set(s.section_id, list);
  }
  for (const [sectionId, list] of bySection) {
    const name = opts.sectionName?.(sectionId) ?? "Inside";
    blocks.push({
      id: newBlockId(),
      type: "heading",
      span: 12,
      text: name,
    });
    for (const s of list) {
      blocks.push({
        id: newBlockId(),
        type: "article",
        span: 6,
        articleId: s.article_id,
        teaser: s.teaser ?? undefined,
        showImage: true,
      });
    }
  }

  return { version: 1, blocks, meta: {} };
}

export function ensureLayout(opts: {
  layout: unknown;
  intro?: string | null;
  introByline?: string | null;
  slots?: LegacySlot[];
  sectionName?: (id: number) => string;
}): { layout: WeeklyLayout; migrated: boolean } {
  const parsed = parseLayout(opts.layout);
  if (parsed.blocks.length > 0) return { layout: parsed, migrated: false };
  const slots = opts.slots ?? [];
  if (!slots.length && !opts.intro?.trim()) {
    return { layout: parsed, migrated: false };
  }
  return {
    layout: layoutFromLegacySlots({
      intro: opts.intro,
      introByline: opts.introByline,
      slots,
      sectionName: opts.sectionName,
    }),
    migrated: true,
  };
}
