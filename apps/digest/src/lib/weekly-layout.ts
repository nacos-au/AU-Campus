import { site } from "@/lib/site";
import type { WeeklyIssueSlot } from "@/lib/types";
import { resolveMasthead, type MastheadWidget } from "@/lib/weekly-masthead";

/* ─────────────────────────────────────────────────────────────────────────
 * Weekly issue layout, v2.
 *
 * One content model: four NAMED REGIONS on a newspaper page. Editors drop an
 * article into a slot; they never position boxes. How the regions are
 * presented (stacked / 2-up / full broadsheet) is decided purely by CSS grid
 * container queries in <WeeklyPage />, never by authored data.
 *
 *   hero       1   full-width top story
 *   lead       1   main column story
 *   secondary  3   row of supporting stories
 *   sidebar    5   narrow rail of briefs
 * ───────────────────────────────────────────────────────────────────────── */

export const WEEKLY_REGIONS = ["hero", "lead", "secondary", "sidebar"] as const;
export type WeeklyRegion = (typeof WEEKLY_REGIONS)[number];

export const REGION_META: Record<
  WeeklyRegion,
  { label: string; capacity: number; hint: string }
> = {
  hero: { label: "Hero", capacity: 1, hint: "Full-width top story" },
  lead: { label: "Lead", capacity: 1, hint: "Main column story" },
  secondary: {
    label: "Secondary",
    capacity: 3,
    hint: "Row of supporting stories",
  },
  sidebar: { label: "Sidebar", capacity: 5, hint: "Narrow rail of briefs" },
};

export type WeeklySlotItem = {
  articleId: string;
  /** Overrides the section name above the headline. */
  kicker?: string;
  /** Overrides the article title on this page only. */
  headline?: string;
  /** Page copy; falls back to dek / excerpt. */
  teaser?: string;
  showImage?: boolean;
};

/**
 * Nameplate settings: the two "ears" flanking the masthead each hold one
 * widget (motto / campus weather / short note). Volume, number and dateline
 * are NOT stored here — they derive from the issue's publish date.
 */
export type WeeklyNameplate = {
  left: MastheadWidget;
  right: MastheadWidget;
  motto: string;
  note: string;
};

export type WeeklyNote = { byline?: string; body: string };

export type WeeklyLayout = {
  version: 2;
  nameplate: WeeklyNameplate;
  note?: WeeklyNote;
  /** Each region is a compact list (no holes) up to its capacity. */
  regions: Record<WeeklyRegion, WeeklySlotItem[]>;
};

export type SlotPos = { region: WeeklyRegion; index: number };

export const DEFAULT_NAMEPLATE: WeeklyNameplate = {
  left: "motto",
  right: "weather",
  motto: site.tagline,
  note: "",
};

/** Does either ear show the campus weather? (Avoids a fetch when neither does.) */
export function usesWeather(n: WeeklyNameplate): boolean {
  return n.left === "weather" || n.right === "weather";
}

/** Result-table / rich-text shapes used by the optional block components. */
export type RichNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export type RichDoc = { type: "doc"; content?: RichNode[] };

export type ScoreRow = {
  id: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  status: string;
};

export function emptyLayout(): WeeklyLayout {
  return {
    version: 2,
    nameplate: { ...DEFAULT_NAMEPLATE },
    regions: { hero: [], lead: [], secondary: [], sidebar: [] },
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function cleanItem(raw: unknown): WeeklySlotItem | null {
  if (!isObj(raw) || typeof raw.articleId !== "string" || !raw.articleId) {
    return null;
  }
  const item: WeeklySlotItem = { articleId: raw.articleId };
  const kicker = str(raw.kicker);
  const headline = str(raw.headline);
  const teaser = str(raw.teaser);
  if (kicker) item.kicker = kicker;
  if (headline) item.headline = headline;
  if (teaser) item.teaser = teaser;
  if (raw.showImage === false) item.showImage = false;
  return item;
}

function normalizeV2(o: Record<string, unknown>): WeeklyLayout {
  const out = emptyLayout();
  const seen = new Set<string>();
  const regions = isObj(o.regions) ? o.regions : {};
  for (const region of WEEKLY_REGIONS) {
    const list = Array.isArray(regions[region]) ? regions[region] : [];
    for (const raw of list as unknown[]) {
      const item = cleanItem(raw);
      if (!item || seen.has(item.articleId)) continue;
      if (out.regions[region].length >= REGION_META[region].capacity) break;
      seen.add(item.articleId);
      out.regions[region].push(item);
    }
  }
  if (isObj(o.nameplate)) {
    const ears = resolveMasthead(o.nameplate);
    out.nameplate = {
      left: ears.left,
      right: ears.right,
      motto:
        typeof o.nameplate.motto === "string"
          ? o.nameplate.motto
          : DEFAULT_NAMEPLATE.motto,
      note: typeof o.nameplate.note === "string" ? o.nameplate.note : "",
    };
  }
  if (isObj(o.note) && typeof o.note.body === "string") {
    out.note = {
      byline: typeof o.note.byline === "string" ? o.note.byline : undefined,
      body: o.note.body,
    };
  }
  return out;
}

/* ── v1 (freeform blocks) → v2 ─────────────────────────────────────────── */

type V1Block = {
  type?: string;
  span?: number;
  variant?: string;
  articleId?: string;
  articleIds?: string[];
  kicker?: string;
  headline?: string;
  teaser?: string;
  showImage?: boolean;
  body?: string;
  byline?: string;
};

function placeFirst(
  layout: WeeklyLayout,
  prefer: WeeklyRegion[],
  item: WeeklySlotItem
): void {
  if (findArticle(layout, item.articleId)) return;
  for (const region of prefer) {
    if (layout.regions[region].length < REGION_META[region].capacity) {
      layout.regions[region].push(item);
      return;
    }
  }
}

function fromV1(blocks: V1Block[]): WeeklyLayout {
  const layout = emptyLayout();
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (b.type === "intro" && typeof b.body === "string" && b.body.trim()) {
      layout.note = { byline: str(b.byline), body: b.body };
    } else if (b.type === "article" && b.articleId) {
      const item = cleanItem(b);
      if (!item) continue;
      const span = b.span ?? 4;
      const prefer: WeeklyRegion[] =
        span >= 12
          ? ["hero", "lead", "secondary", "sidebar"]
          : span >= 8 || b.variant === "lead"
            ? ["lead", "secondary", "sidebar"]
            : ["secondary", "sidebar"];
      placeFirst(layout, prefer, item);
    } else if (b.type === "articleStack" && Array.isArray(b.articleIds)) {
      for (const id of b.articleIds) {
        if (id) placeFirst(layout, ["sidebar", "secondary"], { articleId: id });
      }
    }
  }
  return layout;
}

export function parseLayout(raw: unknown): WeeklyLayout {
  if (!isObj(raw)) return emptyLayout();
  if (raw.version === 2) return normalizeV2(raw);
  if (Array.isArray(raw.blocks)) {
    const layout = fromV1(raw.blocks as V1Block[]);
    // Carry over masthead widgets saved by the block editor (meta.masthead).
    if (isObj(raw.meta) && isObj(raw.meta.masthead)) {
      const m = raw.meta.masthead;
      const ears = resolveMasthead(m);
      layout.nameplate = {
        left: ears.left,
        right: ears.right,
        motto: typeof m.motto === "string" ? m.motto : DEFAULT_NAMEPLATE.motto,
        note: typeof m.note === "string" ? m.note : "",
      };
    }
    return layout;
  }
  return emptyLayout();
}

export function layoutHasContent(layout: WeeklyLayout): boolean {
  return (
    Boolean(layout.note?.body.trim()) ||
    WEEKLY_REGIONS.some((r) => layout.regions[r].length > 0)
  );
}

type LegacySlot = Pick<
  WeeklyIssueSlot,
  "slot" | "position" | "article_id" | "teaser"
>;

/** Map the original lead/second/rail/inside slot rows into v2 once. */
export function layoutFromLegacySlots(opts: {
  intro?: string | null;
  introByline?: string | null;
  slots: LegacySlot[];
}): WeeklyLayout {
  const layout = emptyLayout();
  const intro = opts.intro?.trim();
  if (intro) {
    layout.note = {
      byline: opts.introByline?.trim() || "From the Desk",
      body: intro,
    };
  }
  const sorted = [...opts.slots].sort((a, b) => a.position - b.position);
  const item = (s: LegacySlot): WeeklySlotItem => ({
    articleId: s.article_id,
    ...(s.teaser?.trim() ? { teaser: s.teaser.trim() } : {}),
  });
  const lead = sorted.find((s) => s.slot === "lead");
  if (lead?.article_id) placeFirst(layout, ["lead"], item(lead));
  for (const s of sorted) {
    if (!s.article_id) continue;
    if (s.slot === "second") placeFirst(layout, ["secondary", "sidebar"], item(s));
  }
  for (const s of sorted) {
    if (!s.article_id) continue;
    if (s.slot === "rail") placeFirst(layout, ["sidebar", "secondary"], item(s));
  }
  for (const s of sorted) {
    if (!s.article_id) continue;
    if (s.slot === "inside") placeFirst(layout, ["secondary", "sidebar"], item(s));
  }
  return layout;
}

/** Parse whatever is stored; migrate v1 / legacy slots. `migrated` ⇒ re-save. */
export function ensureLayout(opts: {
  layout: unknown;
  intro?: string | null;
  introByline?: string | null;
  slots?: LegacySlot[];
}): { layout: WeeklyLayout; migrated: boolean } {
  const parsed = parseLayout(opts.layout);
  if (isObj(opts.layout) && opts.layout.version === 2) {
    return { layout: parsed, migrated: false };
  }
  if (layoutHasContent(parsed)) return { layout: parsed, migrated: true };
  const slots = opts.slots ?? [];
  if (!slots.length && !opts.intro?.trim()) {
    return { layout: parsed, migrated: false };
  }
  return {
    layout: layoutFromLegacySlots({
      intro: opts.intro,
      introByline: opts.introByline,
      slots,
    }),
    migrated: true,
  };
}

/* ── Queries ───────────────────────────────────────────────────────────── */

export function articleIdsInLayout(layout: WeeklyLayout): string[] {
  return WEEKLY_REGIONS.flatMap((r) =>
    layout.regions[r].map((i) => i.articleId)
  );
}

export function findArticle(
  layout: WeeklyLayout,
  articleId: string
): SlotPos | null {
  for (const region of WEEKLY_REGIONS) {
    const index = layout.regions[region].findIndex(
      (i) => i.articleId === articleId
    );
    if (index >= 0) return { region, index };
  }
  return null;
}

export function getSlot(
  layout: WeeklyLayout,
  pos: SlotPos
): WeeklySlotItem | null {
  return layout.regions[pos.region][pos.index] ?? null;
}

/* ── Slot operations (pure) ────────────────────────────────────────────── */

function cloneRegions(
  layout: WeeklyLayout
): Record<WeeklyRegion, WeeklySlotItem[]> {
  return {
    hero: [...layout.regions.hero],
    lead: [...layout.regions.lead],
    secondary: [...layout.regions.secondary],
    sidebar: [...layout.regions.sidebar],
  };
}

/** Replace the slot at `pos`, or append when `pos` is the next free slot. */
export function setSlot(
  layout: WeeklyLayout,
  pos: SlotPos,
  item: WeeklySlotItem
): WeeklyLayout {
  const regions = cloneRegions(layout);
  const list = regions[pos.region];
  if (pos.index < list.length) list[pos.index] = item;
  else if (list.length < REGION_META[pos.region].capacity) list.push(item);
  else return layout;
  return { ...layout, regions };
}

export function removeSlot(layout: WeeklyLayout, pos: SlotPos): WeeklyLayout {
  if (!getSlot(layout, pos)) return layout;
  const regions = cloneRegions(layout);
  regions[pos.region].splice(pos.index, 1);
  return { ...layout, regions };
}

export function patchSlot(
  layout: WeeklyLayout,
  pos: SlotPos,
  patch: Partial<Omit<WeeklySlotItem, "articleId">>
): WeeklyLayout {
  const cur = getSlot(layout, pos);
  if (!cur) return layout;
  const next: WeeklySlotItem = { ...cur, ...patch };
  for (const key of ["kicker", "headline", "teaser"] as const) {
    if (!next[key]?.trim()) delete next[key];
  }
  if (next.showImage !== false) delete next.showImage;
  return setSlot(layout, pos, next);
}

/** Swap two filled slots, or move a slot into the next free slot. */
export function moveSlot(
  layout: WeeklyLayout,
  from: SlotPos,
  to: SlotPos
): WeeklyLayout {
  if (from.region === to.region && from.index === to.index) return layout;
  const a = getSlot(layout, from);
  if (!a) return layout;
  const b = getSlot(layout, to);
  const regions = cloneRegions(layout);
  if (b) {
    regions[from.region][from.index] = b;
    regions[to.region][to.index] = a;
  } else {
    if (
      from.region !== to.region &&
      regions[to.region].length >= REGION_META[to.region].capacity
    ) {
      return layout;
    }
    regions[from.region].splice(from.index, 1);
    regions[to.region].push(a);
  }
  return { ...layout, regions };
}

/**
 * Drop a library article into a slot. If it already sits elsewhere in the
 * issue it moves (or swaps) instead of duplicating.
 */
export function placeArticle(
  layout: WeeklyLayout,
  pos: SlotPos,
  articleId: string
): WeeklyLayout {
  const existing = findArticle(layout, articleId);
  if (existing) return moveSlot(layout, existing, pos);
  return setSlot(layout, pos, { articleId });
}

/** Fill every empty slot, in page order, from unplaced article ids. */
export function fillFromArticles(
  layout: WeeklyLayout,
  articleIds: string[]
): WeeklyLayout {
  const placed = new Set(articleIdsInLayout(layout));
  const queue = articleIds.filter((id) => !placed.has(id));
  const regions = cloneRegions(layout);
  for (const region of WEEKLY_REGIONS) {
    while (
      regions[region].length < REGION_META[region].capacity &&
      queue.length
    ) {
      regions[region].push({ articleId: queue.shift()! });
    }
  }
  return { ...layout, regions };
}
