"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, btn } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { WeeklyBlockView } from "@/components/weekly/WeeklyBlockView";
import { createClient } from "@/lib/supabase/client";
import {
  createBlock,
  ensureLayout,
  isSampleLayout,
  parseLayout,
  type WeeklyBlock,
  type WeeklyLayout,
} from "@/lib/weekly-layout";
import { formatWeekLabel, mondayOf, addDaysIso } from "@/lib/weekly";
import type { ArticleWithMeta, Section, WeeklyIssue, WeeklyIssueStatus } from "@/lib/types";

const ISSUE_SELECT =
  "*, weekly_issue_slots(id, slot, position, article_id, section_id, teaser, articles:article_id(id, title, slug, section_id, status, dek, cover_url, body, sections(slug, name)))";

const PALETTE: { type: WeeklyBlock["type"]; label: string }[] = [
  { type: "intro", label: "Intro" },
  { type: "heading", label: "Heading" },
  { type: "text", label: "Text" },
  { type: "article", label: "Article" },
  { type: "articleStack", label: "Article stack" },
  { type: "image", label: "Image" },
  { type: "divider", label: "Divider" },
  { type: "spacer", label: "Spacer" },
];

const STATUS_STYLE: Record<WeeklyIssueStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-ink/10 text-ink-soft",
};

function SortableBlock({
  id,
  selected,
  onSelect,
  children,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded border bg-white ${
        selected ? "border-accent ring-1 ring-accent" : "border-rule"
      }`}
      onClick={onSelect}
    >
      <button
        type="button"
        className="absolute left-1 top-1 z-10 cursor-grab rounded bg-paper/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        Drag
      </button>
      <div className="p-3 pt-7">{children}</div>
    </div>
  );
}

export function WeeklyBoardManager() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { confirm } = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [weekStart, setWeekStart] = useState(mondayOf());
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<WeeklyIssueStatus>("draft");
  const [layout, setLayout] = useState<WeeklyLayout>(() => parseLayout(null));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [mobileAddOpen, setMobileAddOpen] = useState(false);
  const [mobileInspectOpen, setMobileInspectOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [articleQuery, setArticleQuery] = useState("");

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const editingIdRef = useRef<string | null>(null);
  const layoutRef = useRef(layout);
  const metaRef = useRef({ title, weekStart, status, scheduledAt });

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  useEffect(() => {
    metaRef.current = { title, weekStart, status, scheduledAt };
  }, [title, weekStart, status, scheduledAt]);

  const issuesQuery = useQuery({
    queryKey: ["admin-weekly-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_issues")
        .select(ISSUE_SELECT)
        .order("week_start", { ascending: false });
      if (error) throw error;
      return data as unknown as (WeeklyIssue & {
        weekly_issue_slots?: unknown[];
      })[];
    },
  });

  const articlesQuery = useQuery({
    queryKey: ["admin-weekly-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id, title, slug, section_id, status, dek, cover_url, body, sections(slug, name), published_at"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data as unknown as ArticleWithMeta[];
    },
  });

  const sectionsQuery = useQuery({
    queryKey: ["admin-weekly-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return (data ?? []) as Section[];
    },
  });

  const issues = issuesQuery.data ?? [];
  const articles = articlesQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const articlesById = useMemo(() => {
    const m = new Map<string, ArticleWithMeta>();
    for (const a of articles) m.set(a.id, a);
    return m;
  }, [articles]);

  const selected = layout.blocks.find((b) => b.id === selectedId) ?? null;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
    setSaveState("idle");
  }, []);

  const updateLayout = useCallback(
    (fn: (prev: WeeklyLayout) => WeeklyLayout) => {
      setLayout((prev) => {
        const next = fn(prev);
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  const patchBlock = useCallback(
    (id: string, patch: Partial<WeeklyBlock>) => {
      updateLayout((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === id ? ({ ...b, ...patch } as WeeklyBlock) : b
        ),
      }));
    },
    [updateLayout]
  );

  function resetNew() {
    const week = mondayOf();
    setEditingId(null);
    setTitle(`Week of ${formatWeekLabel(week)}`);
    setWeekStart(week);
    setScheduledAt("");
    setStatus("draft");
    setLayout(parseLayout(null));
    setSelectedId(null);
    setError(null);
    dirtyRef.current = false;
    setDirty(false);
    setSaveState("idle");
  }

  function loadIssue(issue: WeeklyIssue & { weekly_issue_slots?: unknown[] }) {
    const sectionName = (id: number) =>
      sections.find((s) => s.id === id)?.name ?? "Inside";
    const { layout: next, migrated } = ensureLayout({
      layout: issue.layout,
      intro: issue.intro,
      introByline: issue.intro_byline,
      slots: (issue.weekly_issue_slots ?? []) as Parameters<
        typeof ensureLayout
      >[0]["slots"],
      sectionName,
    });
    setEditingId(issue.id);
    setTitle(issue.title);
    setWeekStart(issue.week_start);
    setStatus(issue.status);
    setScheduledAt(
      issue.scheduled_at
        ? new Date(issue.scheduled_at).toISOString().slice(0, 16)
        : ""
    );
    setLayout(next);
    setSelectedId(next.blocks[0]?.id ?? null);
    setError(null);
    dirtyRef.current = migrated;
    setDirty(migrated);
    setSaveState(migrated ? "idle" : "saved");
    if (issue.updated_at) setLastSavedAt(new Date(issue.updated_at));
  }

  const persist = useCallback(async () => {
    const meta = metaRef.current;
    const lay = layoutRef.current;
    if (!meta.title.trim()) throw new Error("Title is required.");
    if (!meta.weekStart) throw new Error("Week start is required.");

    const payload = {
      title: meta.title.trim(),
      week_start: meta.weekStart,
      layout: lay,
      updated_at: new Date().toISOString(),
    };

    let id = editingIdRef.current;
    if (id) {
      const { error } = await supabase
        .from("weekly_issues")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("weekly_issues")
        .insert({
          ...payload,
          status: "draft",
          scheduled_at: null,
          published_at: null,
        })
        .select()
        .single<WeeklyIssue>();
      if (error) throw error;
      id = data.id;
      setEditingId(id);
      editingIdRef.current = id;
      setStatus("draft");
    }
    return id;
  }, [supabase]);

  useEffect(() => {
    const t = window.setInterval(async () => {
      if (!dirtyRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaveState("saving");
      try {
        await persist();
        dirtyRef.current = false;
        setDirty(false);
        setLastSavedAt(new Date());
        setSaveState("saved");
        qc.invalidateQueries({ queryKey: ["admin-weekly-issues"] });
      } catch (e) {
        setSaveState("error");
        setError(e instanceof Error ? e.message : "Autosave failed");
      } finally {
        savingRef.current = false;
      }
    }, 2000);
    return () => clearInterval(t);
  }, [persist, qc]);

  const setIssueStatus = useMutation({
    mutationFn: async (next: WeeklyIssueStatus) => {
      if (dirtyRef.current) await persist();
      const id = editingIdRef.current;
      if (!id) throw new Error("Save the issue first.");
      const patch: Record<string, unknown> = {
        status: next,
        updated_at: new Date().toISOString(),
      };
      if (next === "published") patch.published_at = new Date().toISOString();
      if (next === "scheduled") {
        const at = metaRef.current.scheduledAt;
        if (!at) throw new Error("Pick a schedule time.");
        patch.scheduled_at = new Date(at).toISOString();
      }
      if (next === "draft" || next === "archived") patch.scheduled_at = null;
      const { error } = await supabase
        .from("weekly_issues")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
      setStatus(next);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-weekly-issues"] });
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteIssue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-weekly-issues"] });
      resetNew();
    },
    onError: (e: Error) => setError(e.message),
  });

  const createSample = useMutation({
    mutationFn: async () => {
      const prev = addDaysIso(mondayOf(), -7);
      const intro = createBlock("intro");
      if (intro.type === "intro") {
        intro.span = 8;
        intro.byline = "From the Desk";
        intro.body =
          "A quieter week — pack a lead, two narrow features, and a dense rail. Search-pick articles and write optional page copy in the inspector.";
      }
      const sideNote = createBlock("text");
      if (sideNote.type === "text") {
        sideNote.span = 6;
        sideNote.body =
          "Column features stay narrow. Pair a lead with column widgets and a rail stack so the page packs tight.";
      }
      const blocks: WeeklyBlock[] = [intro, sideNote, createBlock("divider")];
      if (articles[0]) {
        const lead = createBlock("article");
        if (lead.type === "article") {
          lead.span = 8;
          lead.variant = "lead";
          lead.articleId = articles[0].id;
          lead.showImage = true;
          lead.teaser =
            lead.teaser ||
            "Optional page teaser — rewrite the dek for the weekly frame.";
        }
        blocks.push(lead);
      }
      if (articles[1]) {
        const col = createBlock("article");
        if (col.type === "article") {
          col.span = 4;
          col.variant = "column";
          col.articleId = articles[1].id;
          col.showImage = true;
        }
        blocks.push(col);
      }
      if (articles[2]) {
        const feat = createBlock("article");
        if (feat.type === "article") {
          feat.span = 4;
          feat.variant = "column";
          feat.articleId = articles[2].id;
          feat.showImage = true;
        }
        blocks.push(feat);
      }
      if (articles[3]) {
        const stack = createBlock("articleStack");
        if (stack.type === "articleStack") {
          stack.span = 4;
          stack.title = "Also this week";
          stack.articleIds = articles.slice(3, 7).map((a) => a.id);
        }
        blocks.push(stack);
      }
      if (blocks.length <= 3) {
        const placeholder = createBlock("text");
        if (placeholder.type === "text") {
          placeholder.span = 12;
          placeholder.body =
            "Publish a few Digest articles, then recreate the sample to see a full lead + columns + rail pack.";
        }
        blocks.push(placeholder);
      }
      const lay: WeeklyLayout = {
        version: 1,
        meta: { sample: true },
        blocks,
      };
      const { data, error } = await supabase
        .from("weekly_issues")
        .upsert(
          {
            week_start: prev,
            title: `Sample · Week of ${formatWeekLabel(prev)}`,
            status: "published",
            published_at: new Date().toISOString(),
            layout: lay,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "week_start" }
        )
        .select(ISSUE_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as WeeklyIssue & { weekly_issue_slots?: unknown[] };
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["admin-weekly-issues"] });
      loadIssue(row);
    },
    onError: (e: Error) => setError(e.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.blocks.findIndex((b) => b.id === active.id);
    const newIndex = layout.blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateLayout((prev) => ({
      ...prev,
      blocks: arrayMove(prev.blocks, oldIndex, newIndex),
    }));
  }

  function addBlock(type: WeeklyBlock["type"]) {
    const block = createBlock(type);
    updateLayout((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
    setSelectedId(block.id);
    setMobileAddOpen(false);
    setMobileInspectOpen(true);
  }

  function removeBlock(id: string) {
    updateLayout((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
    if (selectedId === id) {
      setSelectedId(null);
      setMobileInspectOpen(false);
    }
  }

  useEffect(() => {
    if (!editingId && !title) {
      setTitle(`Week of ${formatWeekLabel(weekStart)}`);
    }
  }, [editingId, title, weekStart]);

  const sample = isSampleLayout(layout);

  const inspector = selected ? (
    <div className="space-y-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
        {selected.type}
      </p>
      {"span" in selected && selected.type !== "divider" && selected.type !== "spacer" && (
        <label className="block">
          <span className="text-[11px] font-semibold uppercase text-ink-soft">
            Width
          </span>
          <select
            className="mt-1 w-full border border-rule px-2 py-1.5"
            value={selected.span}
            onChange={(e) =>
              patchBlock(selected.id, {
                span: Number(e.target.value) as WeeklyBlock["span"],
              } as Partial<WeeklyBlock>)
            }
          >
            {[12, 8, 6, 4]
              .filter((n) => {
                if (selected.type === "articleStack") return n === 4 || n === 6;
                if (selected.type === "heading") return n === 12 || n === 6;
                if (selected.type === "intro" || selected.type === "text")
                  return n === 12 || n === 8 || n === 6;
                if (selected.type === "image") return n === 12 || n === 6;
                return true;
              })
              .map((n) => (
                <option key={n} value={n}>
                  {selected.type === "article"
                    ? n === 12
                      ? "Full (12)"
                      : n === 8
                        ? "Lead (8)"
                        : n === 6
                          ? "Feature (6)"
                          : "Column (4)"
                    : `${n}/12`}
                </option>
              ))}
          </select>
        </label>
      )}
      {selected.type === "intro" && (
        <>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Byline
            </span>
            <input
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.byline ?? ""}
              onChange={(e) =>
                patchBlock(selected.id, { byline: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Body
            </span>
            <textarea
              rows={6}
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.body}
              onChange={(e) =>
                patchBlock(selected.id, { body: e.target.value })
              }
            />
          </label>
        </>
      )}
      {selected.type === "heading" && (
        <label className="block">
          <span className="text-[11px] font-semibold uppercase text-ink-soft">
            Text
          </span>
          <input
            className="mt-1 w-full border border-rule px-2 py-1.5"
            value={selected.text}
            onChange={(e) => patchBlock(selected.id, { text: e.target.value })}
          />
        </label>
      )}
      {selected.type === "text" && (
        <label className="block">
          <span className="text-[11px] font-semibold uppercase text-ink-soft">
            Body
          </span>
          <textarea
            rows={6}
            className="mt-1 w-full border border-rule px-2 py-1.5"
            value={selected.body}
            onChange={(e) => patchBlock(selected.id, { body: e.target.value })}
          />
        </label>
      )}
      {selected.type === "article" && (
        <>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Search articles
            </span>
            <input
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={articleQuery}
              onChange={(e) => setArticleQuery(e.target.value)}
              placeholder="Title or section…"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Article
            </span>
            <select
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.articleId}
              onChange={(e) =>
                patchBlock(selected.id, { articleId: e.target.value })
              }
            >
              <option value="">— Select —</option>
              {articles
                .filter((a) => {
                  const q = articleQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    a.title.toLowerCase().includes(q) ||
                    (a.sections?.name ?? "").toLowerCase().includes(q)
                  );
                })
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                    {a.sections?.name ? ` · ${a.sections.name}` : ""}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Variant
            </span>
            <select
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.variant ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                patchBlock(selected.id, {
                  variant: v
                    ? (v as "lead" | "feature" | "column")
                    : undefined,
                });
              }}
            >
              <option value="">Auto from width</option>
              <option value="lead">Lead</option>
              <option value="feature">Feature</option>
              <option value="column">Column</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Kicker (optional)
            </span>
            <input
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.kicker ?? ""}
              onChange={(e) =>
                patchBlock(selected.id, { kicker: e.target.value })
              }
              placeholder="Overrides section name"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Headline (optional)
            </span>
            <input
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.headline ?? ""}
              onChange={(e) =>
                patchBlock(selected.id, { headline: e.target.value })
              }
              placeholder="Overrides article title on this page"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Teaser (optional)
            </span>
            <textarea
              rows={3}
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.teaser ?? ""}
              onChange={(e) =>
                patchBlock(selected.id, { teaser: e.target.value })
              }
              placeholder="Page copy — not the article dek unless you leave this blank"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.showImage !== false}
              onChange={(e) =>
                patchBlock(selected.id, { showImage: e.target.checked })
              }
            />
            <span className="text-sm">Show image</span>
          </label>
        </>
      )}
      {selected.type === "articleStack" && (
        <>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Stack title
            </span>
            <input
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.title ?? ""}
              onChange={(e) =>
                patchBlock(selected.id, { title: e.target.value })
              }
            />
          </label>
          <div>
            <p className="text-[11px] font-semibold uppercase text-ink-soft">
              Stories (order)
            </p>
            {[0, 1, 2, 3].map((i) => (
              <select
                key={i}
                className="mt-1 w-full border border-rule px-2 py-1.5"
                value={selected.articleIds[i] ?? ""}
                onChange={(e) => {
                  const next = [...selected.articleIds];
                  while (next.length < 4) next.push("");
                  next[i] = e.target.value;
                  patchBlock(selected.id, {
                    articleIds: next.filter(Boolean),
                  });
                }}
              >
                <option value="">— None —</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </>
      )}
      {selected.type === "image" && (
        <>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Image URL
            </span>
            <input
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.url}
              onChange={(e) => patchBlock(selected.id, { url: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-ink-soft">
              Caption
            </span>
            <input
              className="mt-1 w-full border border-rule px-2 py-1.5"
              value={selected.caption ?? ""}
              onChange={(e) =>
                patchBlock(selected.id, { caption: e.target.value })
              }
            />
          </label>
        </>
      )}
      {selected.type === "spacer" && (
        <label className="block">
          <span className="text-[11px] font-semibold uppercase text-ink-soft">
            Size
          </span>
          <select
            className="mt-1 w-full border border-rule px-2 py-1.5"
            value={selected.size}
            onChange={(e) =>
              patchBlock(selected.id, {
                size: e.target.value as "sm" | "md" | "lg",
              })
            }
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
      )}
      <button
        type="button"
        className={btn.danger}
        onClick={() => removeBlock(selected.id)}
      >
        Remove block
      </button>
    </div>
  ) : (
    <p className="text-sm text-ink-soft">Select a block to edit.</p>
  );

  const board = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={layout.blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-12 grid-flow-dense gap-3">
          {layout.blocks.map((block) => (
            <div
              key={block.id}
              className={
                block.span === 12
                  ? "col-span-12"
                  : block.span === 8
                    ? "col-span-12 lg:col-span-8"
                    : block.span === 6
                      ? "col-span-12 lg:col-span-6"
                      : "col-span-12 lg:col-span-4"
              }
            >
              <SortableBlock
                id={block.id}
                selected={selectedId === block.id}
                onSelect={() => {
                  setSelectedId(block.id);
                  setArticleQuery("");
                  setMobileInspectOpen(true);
                }}
              >
                <WeeklyBlockView
                  block={block}
                  articlesById={articlesById}
                  preview
                />
              </SortableBlock>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <div>
      <PageHeader
        title="Weekly Issue"
        description="Freeform board — drag widgets, change widths, autosaves like a draft article."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn.secondary} onClick={resetNew}>
              New week
            </button>
            <button
              type="button"
              className={btn.secondary}
              disabled={createSample.isPending}
              onClick={() => createSample.mutate()}
            >
              Create sample week
            </button>
          </div>
        }
      />

      {error && (
        <p className="mb-4 border border-accent/30 bg-white px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 border border-rule bg-white px-3 py-2 text-sm">
        <span className="text-ink-soft">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "error"
                ? "Save error"
                : dirty
                  ? "Unsaved changes"
                  : "Ready"}
        </span>
        {lastSavedAt && (
          <span className="text-xs text-ink-soft">
            {lastSavedAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {sample && (
          <span className="bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
            Sample
          </span>
        )}
        <span className="flex-1" />
        {editingId && (
          <Link
            href={`/weekly?week=${weekStart}`}
            className="text-xs font-semibold underline"
            target="_blank"
          >
            Preview
          </Link>
        )}
        <button
          type="button"
          className={btn.secondary}
          disabled={setIssueStatus.isPending}
          onClick={() => setIssueStatus.mutate("draft")}
        >
          Draft
        </button>
        <button
          type="button"
          className={btn.secondary}
          disabled={setIssueStatus.isPending || !scheduledAt}
          onClick={() => setIssueStatus.mutate("scheduled")}
        >
          Schedule
        </button>
        <button
          type="button"
          className={btn.primary}
          disabled={setIssueStatus.isPending}
          onClick={() => setIssueStatus.mutate("published")}
        >
          Publish
        </button>
        {editingId && (
          <button
            type="button"
            className={btn.danger}
            onClick={async () => {
              if (
                await confirm({
                  title: sample ? "Delete sample issue?" : "Delete this issue?",
                  body: "This cannot be undone.",
                  danger: true,
                  confirmLabel: "Delete",
                })
              ) {
                deleteIssue.mutate(editingId);
              }
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Mobile add */}
      <div className="mb-3 flex gap-2 lg:hidden">
        <button
          type="button"
          className={btn.secondary}
          onClick={() => setMobileAddOpen(true)}
        >
          Add block
        </button>
        {selected && (
          <button
            type="button"
            className={btn.secondary}
            onClick={() => setMobileInspectOpen(true)}
          >
            Edit block
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[10rem_1fr_16rem]">
        {/* Palette desktop */}
        <aside className="hidden lg:block">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Widgets
          </p>
          <ul className="mt-2 space-y-1">
            {PALETTE.map((p) => (
              <li key={p.type}>
                <button
                  type="button"
                  className="w-full border border-rule bg-white px-2 py-2 text-left text-sm hover:border-ink"
                  onClick={() => addBlock(p.type)}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 border-t border-rule pt-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Issues
            </p>
            {issues.map((issue) => {
              const lay = parseLayout(issue.layout);
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => loadIssue(issue)}
                  className={`block w-full border px-2 py-2 text-left ${
                    editingId === issue.id
                      ? "border-accent"
                      : "border-rule bg-white"
                  }`}
                >
                  <span className="font-semibold leading-snug">{issue.title}</span>
                  <span className="mt-1 flex items-center gap-1 text-[10px] uppercase">
                    <span className={STATUS_STYLE[issue.status]}>
                      {issue.status}
                    </span>
                    {isSampleLayout(lay) ? " · sample" : null}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 border border-rule bg-white p-3">
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase text-ink-soft">
                Title
              </span>
              <input
                className="mt-1 w-full border border-rule px-2 py-1.5 text-sm"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase text-ink-soft">
                Week start (Mon)
              </span>
              <input
                type="date"
                className="mt-1 w-full border border-rule px-2 py-1.5 text-sm"
                value={weekStart}
                onChange={(e) => {
                  setWeekStart(e.target.value);
                  markDirty();
                }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase text-ink-soft">
                Schedule (optional)
              </span>
              <input
                type="datetime-local"
                className="mt-1 w-full border border-rule px-2 py-1.5 text-sm"
                value={scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value);
                  markDirty();
                }}
              />
            </label>
          </div>

          <div className="border border-rule bg-paper p-3 md:p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft lg:hidden">
              Stack order (widths apply on desktop)
            </p>
            {layout.blocks.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-soft">
                Add widgets from the palette to build this week.
              </p>
            ) : (
              board
            )}
          </div>

          {/* Mobile issue list */}
          <div className="lg:hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              All issues
            </p>
            <ul className="mt-2 divide-y divide-rule border border-rule">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm"
                    onClick={() => loadIssue(issue)}
                  >
                    {issue.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Inspector desktop */}
        <aside className="hidden border border-rule bg-white p-4 lg:block">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Inspector
          </p>
          {inspector}
        </aside>
      </div>

      {/* Mobile sheets */}
      {mobileAddOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close"
            onClick={() => setMobileAddOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto bg-paper p-4 shadow-xl">
            <p className="font-bold">Add block</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {PALETTE.map((p) => (
                <li key={p.type}>
                  <button
                    type="button"
                    className="w-full border border-rule px-3 py-3 text-sm"
                    onClick={() => addBlock(p.type)}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {mobileInspectOpen && selected && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close"
            onClick={() => setMobileInspectOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto bg-paper p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">Edit block</p>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => setMobileInspectOpen(false)}
              >
                Done
              </button>
            </div>
            {inspector}
          </div>
        </div>
      )}
    </div>
  );
}
