"use client";

import Image from "next/image";
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
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  GripVertical,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  Smartphone,
  SquarePen,
  Tablet,
  Wand2,
} from "lucide-react";
import { btn } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  DeviceFrame,
  DEVICE_WIDTH,
  type Device,
} from "@/components/weekly/DeviceFrame";
import {
  WeeklyPage,
  type WeeklyEditorHooks,
} from "@/components/weekly/WeeklyPage";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import { createClient } from "@/lib/supabase/client";
import type { ArticleWithMeta, WeeklyIssue, WeeklyIssueStatus } from "@/lib/types";
import type { WeatherSnapshot } from "@/lib/weather";
import {
  REGION_META,
  articleIdsInLayout,
  ensureLayout,
  fillFromArticles,
  getSlot,
  moveSlot,
  patchSlot,
  placeArticle,
  removeSlot,
  emptyLayout,
  usesWeather,
  type SlotPos,
  type WeeklyLayout,
  type WeeklyRegion,
  type WeeklySlotItem,
} from "@/lib/weekly-layout";
import {
  displayTitle,
  effectivePublishDate,
  issueMeta,
  mondayOfIso,
  nextFreeDate,
  todayIso,
} from "@/lib/weekly";
import { MASTHEAD_WIDGETS, type MastheadWidget } from "@/lib/weekly-masthead";

const ISSUE_SELECT =
  "*, weekly_issue_slots(id, slot, position, article_id, section_id, teaser)";

type IssueRow = WeeklyIssue & { weekly_issue_slots?: unknown[] };

type Selection =
  | ({ kind: "slot" } & SlotPos)
  | { kind: "nameplate" }
  | { kind: "note" }
  | null;

const STATUS_STYLE: Record<WeeklyIssueStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-ink/10 text-ink-soft",
};

const DEVICES: { id: Device; label: string; icon: typeof Monitor }[] = [
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "desktop", label: "Desktop", icon: Monitor },
];

const EMPTY_HEIGHT: Record<WeeklyRegion, string> = {
  hero: "min-h-[11rem]",
  lead: "min-h-[10rem]",
  secondary: "min-h-[8rem]",
  sidebar: "min-h-[4.5rem]",
};

const fieldLabel =
  "block text-[11px] font-semibold uppercase tracking-wider text-ink-soft";
const fieldInput =
  "mt-1 block w-full border border-rule-dark bg-paper px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

/** Prefer pointer position; fall back to rect overlap (keyboard drags). */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

function slotLabel(region: WeeklyRegion, index: number) {
  const { label, capacity } = REGION_META[region];
  return capacity > 1 ? `${label} ${index + 1}` : label;
}

/* ── Slot shell: droppable + draggable wrapper around each page slot ───── */

function SlotShell({
  region,
  index,
  item,
  selected,
  onSelect,
  children,
}: {
  region: WeeklyRegion;
  index: number;
  item: WeeklySlotItem | null;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const key = `${region}:${index}`;
  const drop = useDroppable({ id: `pos:${key}`, data: { region, index } });
  const drag = useDraggable({
    id: `slot:${key}`,
    data: { type: "slot", region, index },
    disabled: !item,
  });

  const ring = selected
    ? "outline outline-2 outline-offset-2 outline-accent"
    : drop.isOver
      ? "outline outline-2 outline-offset-2 outline-dashed outline-accent bg-accent-soft"
      : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-rule-dark";

  return (
    <div
      ref={(node) => {
        drop.setNodeRef(node);
        drag.setNodeRef(node);
      }}
      onClick={onSelect}
      className={`group/slot relative cursor-pointer pt-3 ${ring} ${
        drag.isDragging ? "opacity-40" : ""
      }`}
    >
      <span className="pointer-events-none absolute -top-2 left-0 z-10 bg-ink px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-paper">
        {slotLabel(region, index)}
      </span>
      {item ? (
        <button
          type="button"
          aria-label="Drag story to another slot"
          className="absolute -top-2 right-0 z-10 flex cursor-grab touch-none items-center bg-ink px-1 py-0.5 text-paper active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          {...drag.listeners}
          {...drag.attributes}
        >
          <GripVertical className="h-3 w-3" aria-hidden />
        </button>
      ) : null}
      {children ?? (
        <div
          className={`flex ${EMPTY_HEIGHT[region]} items-center justify-center border border-dashed border-rule-dark bg-gray-50 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-soft`}
        >
          Drop a story here
        </div>
      )}
    </div>
  );
}

/* ── Article library / picker ──────────────────────────────────────────── */

function LibraryRow({
  article,
  placed,
  onPick,
}: {
  article: ArticleWithMeta;
  placed: boolean;
  onPick?: () => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `lib:${article.id}`,
    data: { type: "lib", articleId: article.id },
  });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onPick}
      className={`flex cursor-grab gap-2 border bg-white p-2 text-left active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${placed ? "border-rule" : "border-rule-dark hover:border-ink"}`}
    >
      {article.cover_url ? (
        <div className="relative h-10 w-14 shrink-0 overflow-hidden bg-rule">
          <Image
            src={article.cover_url}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-10 w-14 shrink-0 bg-rule" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug">
          {article.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-soft">
          <span>{article.sections?.name ?? "—"}</span>
          {placed ? (
            <span className="bg-green-100 px-1 font-bold text-green-800">
              In issue
            </span>
          ) : null}
        </p>
      </div>
    </li>
  );
}

function ArticleList({
  articles,
  placedIds,
  onPick,
}: {
  articles: ArticleWithMeta[];
  placedIds: Set<string>;
  onPick?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const list = articles.filter((a) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      a.title.toLowerCase().includes(needle) ||
      (a.sections?.name ?? "").toLowerCase().includes(needle)
    );
  });
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search published stories…"
        className={fieldInput}
      />
      <ul className="mt-2 space-y-1.5">
        {list.map((a) => (
          <LibraryRow
            key={a.id}
            article={a}
            placed={placedIds.has(a.id)}
            onPick={onPick ? () => onPick(a.id) : undefined}
          />
        ))}
        {list.length === 0 ? (
          <li className="py-6 text-center text-xs text-ink-soft">
            No published stories match.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/* ── Editor ────────────────────────────────────────────────────────────── */

export function WeeklyIssueEditor({
  weather,
}: {
  weather: WeatherSnapshot | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { confirm } = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState(todayIso());
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<WeeklyIssueStatus>("draft");
  const [layout, setLayout] = useState<WeeklyLayout>(() => emptyLayout());
  const [selection, setSelection] = useState<Selection>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dragLabel, setDragLabel] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const initRef = useRef(false);
  const editingIdRef = useRef<string | null>(null);
  const layoutRef = useRef(layout);
  const metaRef = useRef({ publishDate, scheduledAt });

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  useEffect(() => {
    metaRef.current = { publishDate, scheduledAt };
  }, [publishDate, scheduledAt]);

  const issuesQuery = useQuery({
    queryKey: ["admin-weekly-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_issues")
        .select(ISSUE_SELECT)
        .order("week_start", { ascending: false });
      if (error) throw error;
      return data as unknown as IssueRow[];
    },
  });

  const articlesQuery = useQuery({
    queryKey: ["admin-weekly-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_PUBLIC_SELECT)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data as unknown as ArticleWithMeta[];
    },
  });

  const issues = useMemo(() => issuesQuery.data ?? [], [issuesQuery.data]);
  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);

  const placedIds = useMemo(() => articleIdsInLayout(layout), [layout]);
  const missingIds = useMemo(() => {
    const have = new Set(articles.map((a) => a.id));
    return placedIds.filter((id) => !have.has(id));
  }, [articles, placedIds]);

  const extraQuery = useQuery({
    queryKey: ["admin-weekly-placed", missingIds.join(",")],
    enabled: missingIds.length > 0 && articlesQuery.isSuccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_PUBLIC_SELECT)
        .in("id", missingIds)
        .eq("status", "published");
      if (error) throw error;
      return data as unknown as ArticleWithMeta[];
    },
  });

  const articlesById = useMemo(() => {
    const m = new Map<string, ArticleWithMeta>();
    for (const a of articles) m.set(a.id, a);
    for (const a of extraQuery.data ?? []) m.set(a.id, a);
    return m;
  }, [articles, extraQuery.data]);

  const meta = useMemo(
    () => issueMeta(publishDate || todayIso(), issues, editingId ?? undefined),
    [publishDate, issues, editingId]
  );
  const conflict = issues.find(
    (i) => i.id !== editingId && i.week_start === meta.weekStart
  );

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
    setSaveState("idle");
  }, []);

  const updateLayout = useCallback(
    (fn: (prev: WeeklyLayout) => WeeklyLayout) => {
      setLayout((prev) => fn(prev));
      markDirty();
    },
    [markDirty]
  );

  const startNew = useCallback(
    (list: IssueRow[]) => {
      setEditingId(null);
      setPublishDate(nextFreeDate(list));
      setScheduledAt("");
      setStatus("draft");
      setLayout(emptyLayout());
      setSelection(null);
      setError(null);
      dirtyRef.current = false;
      setDirty(false);
      setSaveState("idle");
    },
    []
  );

  const loadIssue = useCallback((issue: IssueRow) => {
    const { layout: next, migrated } = ensureLayout({
      layout: issue.layout,
      intro: issue.intro,
      introByline: issue.intro_byline,
      slots: (issue.weekly_issue_slots ?? []) as Parameters<
        typeof ensureLayout
      >[0]["slots"],
    });
    setEditingId(issue.id);
    setPublishDate(effectivePublishDate(issue));
    setStatus(issue.status);
    setScheduledAt(
      issue.scheduled_at
        ? new Date(issue.scheduled_at).toISOString().slice(0, 16)
        : ""
    );
    setLayout(next);
    setSelection(null);
    setError(null);
    dirtyRef.current = migrated;
    setDirty(migrated);
    setSaveState(migrated ? "idle" : "saved");
    if (issue.updated_at) setLastSavedAt(new Date(issue.updated_at));
  }, []);

  // Open the current week's issue (or a fresh draft for it) once data lands.
  // One-shot sync of server data into editor state, guarded by initRef.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (initRef.current || !issuesQuery.isSuccess) return;
    initRef.current = true;
    const monday = mondayOfIso(todayIso());
    const current = issues.find((i) => i.week_start === monday);
    if (current) loadIssue(current);
    else startNew(issues);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [issuesQuery.isSuccess, issues, loadIssue, startNew]);

  const persist = useCallback(async () => {
    const m = metaRef.current;
    const lay = layoutRef.current;
    if (!m.publishDate) throw new Error("Publish date is required.");

    const payload = {
      title: displayTitle(m.publishDate),
      week_start: mondayOfIso(m.publishDate),
      publish_date: m.publishDate,
      layout: lay,
      updated_at: new Date().toISOString(),
    };
    const fail = (e: { code?: string; message: string }) =>
      new Error(
        e.code === "23505"
          ? "Another issue already exists for that calendar week. Pick a different publish date or open that issue."
          : e.message
      );

    let id = editingIdRef.current;
    if (id) {
      const { error } = await supabase
        .from("weekly_issues")
        .update(payload)
        .eq("id", id);
      if (error) throw fail(error);
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
      if (error) throw fail(error);
      id = data.id;
      setEditingId(id);
      editingIdRef.current = id;
      setStatus("draft");
    }
    return id;
  }, [supabase]);

  // Autosave, like a draft article.
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
        setError(null);
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
      if (dirtyRef.current || !editingIdRef.current) await persist();
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
      dirtyRef.current = false;
      setDirty(false);
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
      const { error } = await supabase
        .from("weekly_issues")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-weekly-issues"] });
      startNew(issues.filter((i) => i.id !== editingIdRef.current));
    },
    onError: (e: Error) => setError(e.message),
  });

  /* ── Drag & drop ── */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  function onDragStart(e: DragStartEvent) {
    const d = e.active.data.current as
      | { type: "lib"; articleId: string }
      | { type: "slot"; region: WeeklyRegion; index: number }
      | undefined;
    if (d?.type === "lib") {
      setDragLabel(articlesById.get(d.articleId)?.title ?? "Story");
    } else if (d?.type === "slot") {
      const item = getSlot(layout, d);
      setDragLabel(
        (item && articlesById.get(item.articleId)?.title) ?? "Story"
      );
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setDragLabel(null);
    const { active, over } = e;
    const target = over?.data.current as SlotPos | undefined;
    if (!target?.region) return;
    const d = active.data.current as
      | { type: "lib"; articleId: string }
      | { type: "slot"; region: WeeklyRegion; index: number }
      | undefined;
    if (!d) return;
    if (d.type === "lib") {
      updateLayout((p) => placeArticle(p, target, d.articleId));
    } else {
      updateLayout((p) =>
        moveSlot(p, { region: d.region, index: d.index }, target)
      );
    }
    setSelection({ kind: "slot", ...target });
  }

  /* ── Canvas hooks ── */

  const hooks: WeeklyEditorHooks = {
    shell: ({ region, index, item, children }) => (
      <SlotShell
        region={region}
        index={index}
        item={item}
        selected={
          selection?.kind === "slot" &&
          selection.region === region &&
          selection.index === index
        }
        onSelect={() => setSelection({ kind: "slot", region, index })}
      >
        {children}
      </SlotShell>
    ),
    wrapNameplate: (node) => (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSelection({ kind: "nameplate" })}
        onKeyDown={(e) => {
          if (e.key === "Enter") setSelection({ kind: "nameplate" });
        }}
        className={`cursor-pointer ${
          selection?.kind === "nameplate"
            ? "outline outline-2 outline-offset-2 outline-accent"
            : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-rule-dark"
        }`}
      >
        {node}
      </div>
    ),
    wrapNote: (node) => (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!layout.note) {
            updateLayout((p) => ({
              ...p,
              note: { byline: "From the Desk", body: "" },
            }));
          }
          setSelection({ kind: "note" });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") setSelection({ kind: "note" });
        }}
        className={`mb-4 cursor-pointer ${
          selection?.kind === "note"
            ? "outline outline-2 outline-offset-2 outline-accent"
            : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-rule-dark"
        }`}
      >
        {node ?? (
          <div className="flex min-h-[3.5rem] items-center justify-center border border-dashed border-rule-dark bg-gray-50 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            + Editor&apos;s note
          </div>
        )}
      </div>
    ),
  };

  /* ── Inspector ── */

  const placedSet = useMemo(() => new Set(placedIds), [placedIds]);
  const selSlot = selection?.kind === "slot" ? selection : null;
  const selItem = selSlot ? getSlot(layout, selSlot) : null;
  const selArticle = selItem ? articlesById.get(selItem.articleId) : undefined;

  const issuePanel = (
    <section className="space-y-3 border border-rule bg-white p-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Issue
        </p>
        <span
          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[status]}`}
        >
          {status}
        </span>
      </div>
      <label className="block">
        <span className={fieldLabel}>Publish date</span>
        <input
          type="date"
          className={fieldInput}
          value={publishDate}
          onChange={(e) => {
            setPublishDate(e.target.value);
            markDirty();
          }}
        />
      </label>
      {conflict ? (
        <p className="border border-accent/30 bg-accent-soft px-2 py-1.5 text-xs text-accent">
          Another issue (“{conflict.title}”) already owns this calendar week.
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-rule pt-3 text-xs">
        <dt className="text-ink-soft">Volume</dt>
        <dd className="text-right font-semibold">
          Vol. {meta.volumeRoman} · {meta.year}
        </dd>
        <dt className="text-ink-soft">Issue</dt>
        <dd className="text-right font-semibold">No. {meta.number}</dd>
        <dt className="text-ink-soft">Week</dt>
        <dd className="text-right font-semibold">Week {meta.weekNo}</dd>
        <dt className="text-ink-soft">Title</dt>
        <dd className="text-right font-semibold">{meta.title}</dd>
      </dl>
      <p className="text-[11px] leading-snug text-ink-soft">
        Volume, number, week and title are derived from the publish date.
        Move the date and everything renumbers.
      </p>
      <label className="block border-t border-rule pt-3">
        <span className={fieldLabel}>Schedule (optional)</span>
        <input
          type="datetime-local"
          className={fieldInput}
          value={scheduledAt}
          onChange={(e) => {
            setScheduledAt(e.target.value);
            markDirty();
          }}
        />
      </label>
    </section>
  );

  let selectionPanel: ReactNode;
  if (selection?.kind === "nameplate") {
    selectionPanel = (
      <section className="space-y-3 border border-rule bg-white p-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Nameplate
        </p>
        {(["left", "right"] as const).map((side) => (
          <label key={side} className="block">
            <span className={fieldLabel}>
              {side === "left" ? "Left" : "Right"} of masthead
            </span>
            <select
              className={fieldInput}
              value={layout.nameplate[side]}
              onChange={(e) =>
                updateLayout((p) => ({
                  ...p,
                  nameplate: {
                    ...p.nameplate,
                    [side]: e.target.value as MastheadWidget,
                  },
                }))
              }
            >
              {MASTHEAD_WIDGETS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {layout.nameplate.left === "motto" ||
        layout.nameplate.right === "motto" ? (
          <label className="block">
            <span className={fieldLabel}>Motto</span>
            <input
              className={fieldInput}
              value={layout.nameplate.motto}
              onChange={(e) =>
                updateLayout((p) => ({
                  ...p,
                  nameplate: { ...p.nameplate, motto: e.target.value },
                }))
              }
            />
          </label>
        ) : null}
        {layout.nameplate.left === "note" ||
        layout.nameplate.right === "note" ? (
          <label className="block">
            <span className={fieldLabel}>Short note</span>
            <input
              className={fieldInput}
              value={layout.nameplate.note}
              placeholder="e.g. Matchweek 12 edition"
              onChange={(e) =>
                updateLayout((p) => ({
                  ...p,
                  nameplate: { ...p.nameplate, note: e.target.value },
                }))
              }
            />
          </label>
        ) : null}
        {!weather && usesWeather(layout.nameplate) ? (
          <p className="text-xs text-ink-soft">
            Live weather is unavailable right now; the widget appears when the
            feed responds.
          </p>
        ) : null}
        <p className="text-[11px] leading-snug text-ink-soft">
          The masthead is fixed. Volume, issue number, week and the “Free
          Issue” dateline come from the publish date.
        </p>
      </section>
    );
  } else if (selection?.kind === "note" && layout.note) {
    selectionPanel = (
      <section className="space-y-3 border border-rule bg-white p-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Editor&apos;s note
        </p>
        <label className="block">
          <span className={fieldLabel}>Byline</span>
          <input
            className={fieldInput}
            value={layout.note.byline ?? ""}
            onChange={(e) =>
              updateLayout((p) => ({
                ...p,
                note: { body: p.note?.body ?? "", byline: e.target.value },
              }))
            }
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>Note</span>
          <textarea
            rows={6}
            className={fieldInput}
            value={layout.note.body}
            onChange={(e) =>
              updateLayout((p) => ({
                ...p,
                note: { byline: p.note?.byline, body: e.target.value },
              }))
            }
          />
        </label>
        <button
          type="button"
          className={btn.danger}
          onClick={() => {
            updateLayout((p) => ({ ...p, note: undefined }));
            setSelection(null);
          }}
        >
          Remove note
        </button>
      </section>
    );
  } else if (selSlot) {
    const pos: SlotPos = { region: selSlot.region, index: selSlot.index };
    selectionPanel = (
      <section className="space-y-3 border border-rule bg-white p-3 text-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            {slotLabel(pos.region, pos.index)} slot
          </p>
          <p className="text-[11px] text-ink-soft">
            {REGION_META[pos.region].hint}
          </p>
        </div>
        {selItem ? (
          <>
            <p className="font-serif text-sm font-bold leading-snug">
              {selArticle?.title ?? "Story unavailable"}
            </p>
            <label className="block">
              <span className={fieldLabel}>Kicker</span>
              <input
                className={fieldInput}
                value={selItem.kicker ?? ""}
                placeholder={selArticle?.sections?.name ?? "Section"}
                onChange={(e) =>
                  updateLayout((p) =>
                    patchSlot(p, pos, { kicker: e.target.value })
                  )
                }
              />
            </label>
            <label className="block">
              <span className={fieldLabel}>Headline</span>
              <input
                className={fieldInput}
                value={selItem.headline ?? ""}
                placeholder={selArticle?.title}
                onChange={(e) =>
                  updateLayout((p) =>
                    patchSlot(p, pos, { headline: e.target.value })
                  )
                }
              />
            </label>
            <label className="block">
              <span className={fieldLabel}>Teaser</span>
              <textarea
                rows={3}
                className={fieldInput}
                value={selItem.teaser ?? ""}
                placeholder="Defaults to the article dek"
                onChange={(e) =>
                  updateLayout((p) =>
                    patchSlot(p, pos, { teaser: e.target.value })
                  )
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selItem.showImage !== false}
                onChange={(e) =>
                  updateLayout((p) =>
                    patchSlot(p, pos, { showImage: e.target.checked })
                  )
                }
              />
              <span>Show image</span>
            </label>
            <button
              type="button"
              className={btn.danger}
              onClick={() => {
                updateLayout((p) => removeSlot(p, pos));
                setSelection(null);
              }}
            >
              Remove from slot
            </button>
            <div className="border-t border-rule pt-3">
              <p className={fieldLabel}>Replace with…</p>
              <div className="mt-2 max-h-72 overflow-y-auto">
                <ArticleList
                  articles={articles}
                  placedIds={placedSet}
                  onPick={(id) => updateLayout((p) => placeArticle(p, pos, id))}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <p className="mb-2 text-xs text-ink-soft">
              Drag a story from the library, or pick one below.
            </p>
            <div className="max-h-96 overflow-y-auto">
              <ArticleList
                articles={articles}
                placedIds={placedSet}
                onPick={(id) => {
                  updateLayout((p) => placeArticle(p, pos, id));
                }}
              />
            </div>
          </div>
        )}
      </section>
    );
  } else {
    selectionPanel = (
      <p className="border border-dashed border-rule-dark p-3 text-xs text-ink-soft">
        Click the nameplate or any slot on the page to edit it.
      </p>
    );
  }

  const livePath = `/weekly?week=${meta.weekStart}`;
  const saveText =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save error"
          : dirty
            ? "Unsaved changes"
            : "Ready";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragLabel(null)}
    >
      <div className="flex min-h-screen flex-col bg-gray-100 lg:h-screen">
        {/* ── Toolbar ── */}
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-paper px-3 py-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Newsroom
          </Link>

          <div className="flex min-w-0 items-center gap-2">
            <select
              aria-label="Open issue"
              className="max-w-[16rem] border border-rule-dark bg-paper px-2 py-1.5 text-xs font-semibold"
              value={editingId ?? ""}
              onChange={(e) => {
                const row = issues.find((i) => i.id === e.target.value);
                if (row) loadIssue(row);
              }}
            >
              {!editingId ? (
                <option value="">{`New · ${displayTitle(publishDate || todayIso())}`}</option>
              ) : null}
              {issues.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} · {i.status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={btn.secondary}
              onClick={() => startNew(issues)}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New issue
            </button>
          </div>

          <div className="mx-auto flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Mode"
              className="inline-flex border border-ink"
            >
              {(
                [
                  { id: "edit", label: "Edit", icon: SquarePen },
                  { id: "preview", label: "Preview", icon: Eye },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                    mode === id ? "bg-ink text-paper" : "hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Device preview"
              className="inline-flex border border-rule-dark"
            >
              {DEVICES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  title={`${label} · ${DEVICE_WIDTH[id]}px`}
                  aria-label={`${label} preview`}
                  aria-pressed={device === id}
                  onClick={() => setDevice(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                    device === id
                      ? "bg-accent text-white"
                      : "text-ink-soft hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="hidden xl:inline">{label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={btn.ghost}
              onClick={() => setFocus((f) => !f)}
              aria-pressed={focus}
              title="Hide the side panels"
            >
              {focus ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              )}
              {focus ? "Show panels" : "Focus"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-soft">
              {saveText}
              {lastSavedAt && saveState === "saved"
                ? ` · ${lastSavedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </span>
            {(status === "published" || status === "scheduled") && editingId ? (
              <a
                href={livePath}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold underline"
              >
                View live
              </a>
            ) : null}
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
          </div>
        </header>

        {error ? (
          <p className="shrink-0 border-b border-accent/30 bg-white px-4 py-2 text-sm text-accent">
            {error}
          </p>
        ) : null}

        {/* ── Body: library · canvas · inspector ── */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {!focus ? (
            <aside className="order-2 w-full shrink-0 border-t border-rule bg-paper p-3 lg:order-1 lg:w-64 lg:overflow-y-auto lg:border-r lg:border-t-0">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Story library
                </p>
                <button
                  type="button"
                  className={btn.ghost}
                  title="Fill every empty slot with the latest published stories"
                  onClick={() =>
                    updateLayout((p) =>
                      fillFromArticles(
                        p,
                        articles.map((a) => a.id)
                      )
                    )
                  }
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden />
                  Fill
                </button>
              </div>
              <p className="mb-2 text-[11px] leading-snug text-ink-soft">
                Drag a story onto a slot, or click a slot and pick one.
              </p>
              {articlesQuery.isLoading ? (
                <p className="text-xs text-ink-soft">Loading stories…</p>
              ) : (
                <ArticleList
                  articles={articles}
                  placedIds={placedSet}
                  onPick={
                    selSlot
                      ? (id) => {
                          const pos = {
                            region: selSlot.region,
                            index: selSlot.index,
                          };
                          updateLayout((p) => placeArticle(p, pos, id));
                        }
                      : undefined
                  }
                />
              )}
            </aside>
          ) : null}

          <main className="order-1 min-w-0 flex-1 overflow-x-hidden px-3 py-6 lg:order-2 lg:overflow-y-auto lg:px-8">
            <div className="mx-auto mb-3 flex max-w-[1320px] items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              <span>
                {mode === "edit" ? "Editing" : "Draft preview"} ·{" "}
                {DEVICES.find((d) => d.id === device)?.label}{" "}
                {DEVICE_WIDTH[device]}px
              </span>
            </div>
            <DeviceFrame device={device}>
              <WeeklyPage
                layout={layout}
                articlesById={articlesById}
                meta={meta}
                weather={weather}
                preview={mode === "preview"}
                editor={mode === "edit" ? hooks : undefined}
              />
            </DeviceFrame>
          </main>

          {!focus ? (
            <aside className="order-3 w-full shrink-0 space-y-3 border-t border-rule bg-gray-50 p-3 lg:w-72 lg:overflow-y-auto lg:border-l lg:border-t-0">
              {issuePanel}
              {selectionPanel}
              {editingId ? (
                <button
                  type="button"
                  className={btn.danger}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Delete this issue?",
                        body: "This cannot be undone.",
                        danger: true,
                        confirmLabel: "Delete",
                      })
                    ) {
                      deleteIssue.mutate(editingId);
                    }
                  }}
                >
                  Delete issue
                </button>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragLabel ? (
          <div className="max-w-[16rem] border border-accent bg-white px-3 py-2 text-xs font-semibold shadow-lg">
            {dragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}