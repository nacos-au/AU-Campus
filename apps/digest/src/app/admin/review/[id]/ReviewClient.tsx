"use client";

import { useConfirm } from "@/components/ConfirmDialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { countUntaggedImages, readingMinutes } from "@/lib/articles";
import { diffBodies, diffHasChanges, diffSummary } from "@/lib/doc-diff";
import { ImageInfo } from "@/components/ImageInfo";
import { RichText } from "@/components/RichText";
import { TrackedBody } from "@/components/TrackedBody";
import {
  FeedbackEditor,
  type FeedbackEditorHandle,
} from "@/components/FeedbackEditor";
import { IconMoreVertical } from "@/components/icons";
import {
  applyReviewHighlights,
  captureAnchorFromSelection,
  formatReviewTimestamp,
  scrollToReviewHighlight,
  type HighlightSpec,
} from "@/lib/review-highlights";
import type { ReviewComment, RevisionPayload, Section } from "@/lib/types";

type IconPopover = {
  id: string;
  body: string;
  time: string;
  author: string;
  top: number;
  left: number;
  pinned: boolean;
};

const STATE_LABELS: Record<string, string> = {
  draft: "Draft",
  awaiting_editor: "Awaiting editor",
  awaiting_writer: "Awaiting writer",
  published: "Live",
  scheduled: "Parked",
};

export function ReviewClient({
  articleId,
  content,
  state,
  isRevision,
  canReview,
  canMakeLive,
  canMoveDesk,
  sectionId: initialSectionId,
  sections,
  isAuthor,
  assignedEditorIsMe,
  userId,
  isSuperAdmin,
  adminModeOn,
  initialComments,
  baselineBody,
  canEditBody,
}: {
  articleId: string;
  content: RevisionPayload;
  state: string;
  isRevision: boolean;
  canReview: boolean;
  canMakeLive: boolean;
  canMoveDesk: boolean;
  sectionId: number;
  sections: Section[];
  isAuthor: boolean;
  assignedEditorIsMe: boolean;
  userId: string;
  isSuperAdmin: boolean;
  adminModeOn: boolean;
  initialComments: ReviewComment[];
  /** What the editor last reviewed (or the live story for a pending edit). */
  baselineBody: unknown | null;
  /** Author may fix the copy right here (story is back with the writer). */
  canEditBody: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const qc = useQueryClient();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [quotePrefix, setQuotePrefix] = useState<string | null>(null);
  const [quoteSuffix, setQuoteSuffix] = useState<string | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
    null
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState(String(initialSectionId));
  const [deskBusy, setDeskBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [iconPop, setIconPop] = useState<IconPopover | null>(null);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const hashHandled = useRef(false);
  const { confirm } = useConfirm();

  type ViewMode = "clean" | "changes" | "edit";
  const [liveBody, setLiveBody] = useState<unknown>(content.body);
  const liveBodyRef = useRef<unknown>(content.body);
  const editorHandle = useRef<FeedbackEditorHandle | null>(null);
  const diffBlocks = useMemo(
    () => (baselineBody ? diffBodies(baselineBody, liveBody) : null),
    [baselineBody, liveBody]
  );
  const hasDiff = !!diffBlocks && diffHasChanges(diffBlocks);
  const [mode, setMode] = useState<ViewMode>(() => {
    if (canEditBody) return "edit";
    if (baselineBody && diffHasChanges(diffBodies(baselineBody, content.body))) {
      return "changes";
    }
    return "clean";
  });

  const handleBodyChange = useCallback((b: unknown) => {
    liveBodyRef.current = b;
    setLiveBody(b);
  }, []);

  const reportMissed = useCallback((ids: string[]) => {
    setMissedIds((prev) => (prev.join("\0") === ids.join("\0") ? prev : ids));
  }, []);

  async function switchMode(next: ViewMode) {
    if (next === mode) return;
    if (mode === "edit") {
      try {
        await editorHandle.current?.flush();
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    setMode(next);
  }

  const showSelfAssignTools = isSuperAdmin && adminModeOn;

  function focusThread(id: string) {
    if (!id || id === "pending") return;
    setActiveHighlightId(id);
    if (bodyRef.current) scrollToReviewHighlight(bodyRef.current, id);
    const narrow = window.matchMedia("(max-width: 1023px)").matches;
    const scrollCard = () => {
      const el = document.getElementById(`review-c-${id}`);
      el?.scrollIntoView({
        behavior: "smooth",
        block: narrow ? "start" : "nearest",
      });
    };
    requestAnimationFrame(() => {
      scrollCard();
      window.setTimeout(scrollCard, 120);
    });
  }

  function jumpToComments() {
    document
      .getElementById("review-thread")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    setSectionId(String(initialSectionId));
  }, [initialSectionId]);

  const { data: comments = [] } = useQuery({
    queryKey: ["review-comments", articleId],
    initialData: initialComments,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_review_comments")
        .select("*, profiles(display_name)")
        .eq("article_id", articleId)
        .order("created_at");
      if (error) throw error;
      return data as unknown as ReviewComment[];
    },
  });

  const body = useMemo(() => <RichText doc={liveBody} />, [liveBody]);

  const highlightSpecs: HighlightSpec[] = useMemo(() => {
    const specs: HighlightSpec[] = comments
      .filter((c) => !c.resolved && c.anchor?.quote)
      .map((c) => {
        const { relative, absolute } = formatReviewTimestamp(c.created_at);
        return {
          id: c.id,
          quote: c.anchor!.quote!,
          prefix: c.anchor?.prefix ?? null,
          suffix: c.anchor?.suffix ?? null,
          body: c.body,
          timeLabel: `${relative} · ${absolute}`,
          authorLabel:
            c.author_id === userId
              ? "You"
              : (c.profiles?.display_name ?? "Editor"),
        };
      });
    if (quote && activeHighlightId === "pending") {
      specs.unshift({
        id: "pending",
        quote,
        prefix: quotePrefix,
        suffix: quoteSuffix,
      });
    }
    return specs;
  }, [
    comments,
    quote,
    quotePrefix,
    quoteSuffix,
    activeHighlightId,
    userId,
  ]);

  const quoteKey = highlightSpecs
    .map((s) => `${s.id}:${s.quote}:${s.prefix ?? ""}:${s.suffix ?? ""}`)
    .join("\u0000");

  function paintHighlights() {
    // Only the read-only clean view is painted by hand; the editor draws its
    // own highlights and the changes view mixes old and new text.
    if (mode !== "clean") return;
    const root = bodyRef.current;
    if (!root) return;
    const { missed } = applyReviewHighlights(root, highlightSpecs);
    const nextKey = missed.join("\0");
    setMissedIds((prev) => (prev.join("\0") === nextKey ? prev : missed));
  }

  useLayoutEffect(() => {
    paintHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, mode, liveBody]);

  // Recover if a parent re-render wiped imperative marks while quoteKey stayed put
  useLayoutEffect(() => {
    if (mode !== "clean") return;
    const root = bodyRef.current;
    if (!root || highlightSpecs.length === 0) return;
    const missing = highlightSpecs.some(
      (s) =>
        !!s.quote &&
        !root.querySelector(`mark[data-review-id="${CSS.escape(s.id)}"]`)
    );
    if (missing) paintHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // After marks paint (or when selecting a comment), scroll mark + rail card into view
  useEffect(() => {
    if (!activeHighlightId || activeHighlightId === "pending") return;
    const id = activeHighlightId;
    const narrow = window.matchMedia("(max-width: 1023px)").matches;
    const t = window.setTimeout(() => {
      if (bodyRef.current) scrollToReviewHighlight(bodyRef.current, id);
      document
        .getElementById(`review-c-${id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: narrow ? "start" : "nearest",
        });
    }, 40);
    return () => window.clearTimeout(t);
  }, [activeHighlightId, quoteKey]);

  // Deep links from writer panel: #review-c-{id} or #review-thread
  useEffect(() => {
    if (hashHandled.current || comments.length === 0) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      hashHandled.current = true;
      return;
    }
    if (hash === "review-thread") {
      hashHandled.current = true;
      document
        .getElementById("review-thread")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const m = /^review-c-(.+)$/.exec(hash);
    if (m?.[1] && comments.some((c) => c.id === m[1])) {
      hashHandled.current = true;
      focusThread(m[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, comments]);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    function popFromBtn(btn: HTMLElement, pinned: boolean): IconPopover {
      const rect = btn.getBoundingClientRect();
      return {
        id: btn.dataset.reviewId ?? "",
        body: btn.dataset.body ?? "",
        time: btn.dataset.time ?? "",
        author: btn.dataset.author ?? "",
        top: rect.bottom + 8 + window.scrollY,
        left: Math.min(
          rect.left + window.scrollX,
          window.scrollX + window.innerWidth - 280
        ),
        pinned,
      };
    }

    function onPointerOver(e: Event) {
      const t = e.target as HTMLElement | null;
      const btn = t?.closest?.("button[data-review-icon]") as HTMLElement | null;
      if (!btn) return;
      setIconPop((prev) => (prev?.pinned ? prev : popFromBtn(btn, false)));
    }

    function onPointerOut(e: Event) {
      const ev = e as PointerEvent;
      const t = ev.target as HTMLElement | null;
      const btn = t?.closest?.("button[data-review-icon]") as HTMLElement | null;
      if (!btn) return;
      const related = ev.relatedTarget as HTMLElement | null;
      if (related?.closest?.("[data-review-popover]")) return;
      setIconPop((prev) => (prev?.pinned ? prev : null));
    }

    function onClick(e: Event) {
      const t = e.target as HTMLElement | null;
      const btn = t?.closest?.("button[data-review-icon]") as HTMLElement | null;
      const mark = t?.closest?.("mark[data-review-id]") as HTMLElement | null;
      const id = btn?.dataset.reviewId || mark?.dataset.reviewId || "";
      if (!id || id === "pending") return;
      e.preventDefault();
      e.stopPropagation();
      if (btn) {
        setIconPop((prev) => {
          if (prev?.pinned && prev.id === id) return null;
          return popFromBtn(btn, true);
        });
      }
      focusThread(id);
    }

    function onDocClick(e: Event) {
      const t = e.target as HTMLElement | null;
      if (
        t?.closest?.("button[data-review-icon]") ||
        t?.closest?.("mark[data-review-id]") ||
        t?.closest?.("[data-review-popover]")
      ) {
        return;
      }
      setIconPop((prev) => (prev?.pinned ? null : prev));
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIconPop(null);
    }

    root.addEventListener("pointerover", onPointerOver);
    root.addEventListener("pointerout", onPointerOut);
    root.addEventListener("click", onClick);
    document.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerout", onPointerOut);
      root.removeEventListener("click", onClick);
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
    // focusThread closes over stable setters / refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  useEffect(() => {
    if (!canReview) return;
    void supabase.rpc("heartbeat_review", { p_article_id: articleId });
    const tick = window.setInterval(() => {
      void supabase.rpc("heartbeat_review", { p_article_id: articleId });
    }, 60_000);
    return () => {
      window.clearInterval(tick);
      void supabase.rpc("release_review", { p_article_id: articleId });
    };
  }, [canReview, articleId, supabase]);

  function clearPendingHighlight() {
    setQuote(null);
    setQuotePrefix(null);
    setQuoteSuffix(null);
    setActiveHighlightId((id) => (id === "pending" ? null : id));
  }

  function captureSelection() {
    if (mode !== "clean") return;
    if (!bodyRef.current) return;
    const anchor = captureAnchorFromSelection(bodyRef.current);
    if (!anchor?.quote) return;
    setQuote(anchor.quote);
    setQuotePrefix(anchor.prefix ?? null);
    setQuoteSuffix(anchor.suffix ?? null);
    setActiveHighlightId("pending");
  }

  async function post() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setSavedFlash(null);
    const bodyText = text.trim();
    const hadQuote = !!quote;
    const anchor = quote
      ? { quote, prefix: quotePrefix ?? undefined, suffix: quoteSuffix ?? undefined }
      : null;
    const { data, error } = await supabase.rpc("add_review_comment", {
      p_article_id: articleId,
      p_body: bodyText,
      p_anchor: anchor,
    });
    setBusy(false);
    if (error) return setError(error.message);
    const newId = typeof data === "string" ? data : null;
    setText("");

    // Optimistic insert before clearing pending so quoteKey never goes empty
    // for this highlight (avoids clearMarks wiping the only visible mark).
    if (newId) {
      const optimistic: ReviewComment = {
        id: newId,
        article_id: articleId,
        author_id: userId,
        body: bodyText,
        anchor,
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: new Date().toISOString(),
        profiles: { display_name: "You" },
      };
      qc.setQueryData<ReviewComment[]>(
        ["review-comments", articleId],
        (prev) => {
          const list = prev ?? [];
          if (list.some((c) => c.id === newId)) return list;
          return [...list, optimistic];
        }
      );
      clearPendingHighlight();
      setActiveHighlightId(newId);
    } else {
      clearPendingHighlight();
    }

    setSavedFlash(
      hadQuote ? "Comment saved on highlight." : "General note saved."
    );
    await qc.invalidateQueries({ queryKey: ["review-comments", articleId] });
    await qc.refetchQueries({ queryKey: ["review-comments", articleId] });
    if (!newId) {
      document
        .getElementById("review-thread")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    window.setTimeout(() => setSavedFlash(null), 4000);
  }

  async function saveEdit(id: string) {
    if (!editBody.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("update_review_comment", {
      p_comment_id: id,
      p_body: editBody,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setEditingId(null);
    setEditBody("");
    qc.invalidateQueries({ queryKey: ["review-comments", articleId] });
  }

  async function removeComment(id: string) {
    const ok = await confirm({
      title: "Remove this highlight?",
      body: "The comment and yellow mark will be deleted.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("delete_review_comment", {
      p_comment_id: id,
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (activeHighlightId === id) setActiveHighlightId(null);
    qc.invalidateQueries({ queryKey: ["review-comments", articleId] });
  }

  async function toggleResolved(id: string, resolved: boolean) {
    const { error } = await supabase.rpc("resolve_review_comment", {
      p_comment_id: id,
      p_resolved: resolved,
    });
    if (error) setError(error.message);
    else qc.invalidateQueries({ queryKey: ["review-comments", articleId] });
  }

  async function assignToMe() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("admin_assign_review_to_me", {
      p_article_id: articleId,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function revokeSelfAssign() {
    const ok = await confirm({
      title: "Revoke self-assign?",
      body: "Clears your assignment so the piece can go to a real editor on the next send.",
      confirmLabel: "Revoke",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("admin_revoke_self_review_assign", {
      p_article_id: articleId,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function moveDesk(nextId: string) {
    if (!canMoveDesk || !nextId || nextId === sectionId) return;
    const label =
      sections.find((s) => String(s.id) === nextId)?.name ?? "that desk";
    const ok = await confirm({
      title: `Move to ${label}?`,
      body:
        state === "published"
          ? "The live story moves to that section immediately. No rewrite approval needed."
          : "Updates the desk for this piece before it goes live.",
      confirmLabel: "Move desk",
    });
    if (!ok) {
      setSectionId(String(initialSectionId));
      return;
    }
    setDeskBusy(true);
    setError(null);
    const { error } = await supabase.rpc("move_article_desk", {
      p_article_id: articleId,
      p_section_id: Number(nextId),
    });
    setDeskBusy(false);
    if (error) {
      setSectionId(String(initialSectionId));
      return setError(error.message);
    }
    setSectionId(nextId);
    router.refresh();
  }

  async function submitRevisions() {
    setError(null);
    try {
      await editorHandle.current?.flush();
    } catch (e) {
      return setError((e as Error).message);
    }
    const missing = countUntaggedImages({
      coverUrl: content.cover_url,
      coverCaption: content.cover_caption,
      body: liveBodyRef.current,
    });
    if (missing > 0) {
      return setError(
        `Add a short description to every photo before sending (${missing} still ${
          missing === 1 ? "needs" : "need"
        } one).`
      );
    }
    const open = comments.filter((c) => !c.resolved).length;
    const ok = await confirm({
      title: "Send back to the editor?",
      body:
        open > 0
          ? `${open} editor comment${open === 1 ? " is" : "s are"} still open. You can mark them addressed first, or send now.`
          : "Your revised copy goes back to the assigned editor.",
      confirmLabel: "Submit revisions",
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.rpc("submit_article", {
      p_article_id: articleId,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/admin/articles");
    router.refresh();
  }

  async function act(kind: "changes" | "approve" | "park" | "make_live") {
    const ok = await confirm(
      kind === "park"
        ? {
            title: "Approve and park?",
            body: "The story is approved but stays off the public site until an editor clicks Make live.",
            confirmLabel: "Park",
          }
        : kind === "make_live"
          ? {
              title: "Make this story live?",
              body: "Readers will see it on the site immediately.",
              confirmLabel: "Make live",
            }
          : kind === "approve"
            ? isRevision
              ? {
                  title: "Approve this edit?",
                  body: "The live story updates immediately for readers.",
                  confirmLabel: "Publish edit",
                }
              : {
                  title: "Approve and publish?",
                  body: "The story goes live on the site immediately.",
                  confirmLabel: "Publish now",
                }
            : {
                title: "Send back to the writer?",
                body: "They’ll be notified and can revise using your comments.",
                confirmLabel: "Request changes",
              }
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error } =
      kind === "make_live"
        ? await supabase.rpc("publish_parked_article", {
            p_article_id: articleId,
          })
        : kind === "approve" || kind === "park"
          ? await supabase.rpc("review_approve", {
              p_article_id: articleId,
              p_park: kind === "park",
            })
          : await supabase.rpc("review_request_changes", {
              p_article_id: articleId,
              p_note: null,
            });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/admin/articles");
    router.refresh();
  }

  return (
    <div className="mt-4 grid gap-8 pb-20 lg:grid-cols-[minmax(0,1fr)_24rem] lg:pb-0">
      <article>
        {showSelfAssignTools && (
          <div className="mb-4 flex flex-wrap items-center gap-2 border border-rule-dark bg-gray-50 px-3 py-2 text-[11px]">
            <span className="font-bold uppercase tracking-wider text-ink-soft">
              Super admin · test assign
            </span>
            <button
              type="button"
              disabled={busy || assignedEditorIsMe}
              onClick={() => void assignToMe()}
              className="border border-ink px-2 py-1 font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-40"
            >
              Assign to me
            </button>
            <button
              type="button"
              disabled={busy || !assignedEditorIsMe}
              onClick={() => void revokeSelfAssign()}
              className="border border-rule-dark px-2 py-1 font-semibold uppercase tracking-wider text-ink-soft hover:border-ink hover:text-ink disabled:opacity-40"
            >
              Revoke self-assign
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-rule px-2.5 py-0.5 font-semibold uppercase tracking-wide text-ink-soft">
            {isRevision ? "Edit · " : ""}
            {STATE_LABELS[state] ?? state}
          </span>
          {canReview && (
            <span className="text-ink-soft">
              Select text in the story to attach a comment to it.
            </span>
          )}
        </div>
        {content.cover_url && (
          <figure className="mb-6">
            <ImageInfo
              description={content.cover_caption}
              className="aspect-video w-full overflow-hidden"
            >
              <Image
                src={content.cover_url}
                alt={content.cover_caption?.trim() || content.title || ""}
                fill
                className="object-cover"
              />
            </ImageInfo>
          </figure>
        )}
        <h1 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">
          {content.title}
        </h1>
        {content.dek && (
          <p className="mt-3 font-serif text-xl text-ink-soft">{content.dek}</p>
        )}
        {content.byline && (
          <p className="mt-3 text-sm font-semibold">By {content.byline}</p>
        )}
        <p className="mt-3 text-xs text-ink-soft">
          {readingMinutes(liveBody, {
            extraImages: content.cover_url ? 1 : 0,
          })}{" "}
          min read
        </p>

        {(canEditBody || diffBlocks) && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-rule py-2 text-xs">
            {canEditBody && (
              <button
                type="button"
                onClick={() => void switchMode("edit")}
                className={
                  mode === "edit"
                    ? "bg-ink px-3 py-1.5 font-semibold uppercase tracking-wider text-paper"
                    : "border border-rule-dark px-3 py-1.5 font-semibold uppercase tracking-wider hover:border-ink"
                }
              >
                Edit
              </button>
            )}
            {diffBlocks && (
              <button
                type="button"
                onClick={() => void switchMode("changes")}
                className={
                  mode === "changes"
                    ? "bg-ink px-3 py-1.5 font-semibold uppercase tracking-wider text-paper"
                    : "border border-rule-dark px-3 py-1.5 font-semibold uppercase tracking-wider hover:border-ink"
                }
              >
                {canEditBody ? "My changes" : "Changes"}
                {hasDiff
                  ? ` · ${(() => {
                      const s = diffSummary(diffBlocks);
                      return s.added + s.removed + s.edited;
                    })()}`
                  : ""}
              </button>
            )}
            <button
              type="button"
              onClick={() => void switchMode("clean")}
              className={
                mode === "clean"
                  ? "bg-ink px-3 py-1.5 font-semibold uppercase tracking-wider text-paper"
                  : "border border-rule-dark px-3 py-1.5 font-semibold uppercase tracking-wider hover:border-ink"
              }
            >
              Clean
            </button>
            <span className="text-[11px] text-ink-soft">
              {mode === "edit"
                ? "Fix the copy where the editor flagged it. Edits save automatically."
                : mode === "changes"
                  ? hasDiff
                    ? canEditBody
                      ? "Green is what you added, red is what you removed."
                      : "Green was added and red removed since the last review. Switch to Clean to comment on text."
                    : "No changes since the last review."
                  : ""}
            </span>
          </div>
        )}

        <div
          ref={bodyRef}
          onMouseUp={captureSelection}
          onTouchEnd={captureSelection}
          className="mt-6"
        >
          {mode === "edit" ? (
            <FeedbackEditor
              articleId={articleId}
              isRevision={isRevision}
              payloadBase={content}
              initialBody={liveBody}
              specs={highlightSpecs.filter((s) => s.id !== "pending")}
              specsKey={quoteKey}
              onHighlightClick={focusThread}
              onMissed={reportMissed}
              onBodyChange={handleBodyChange}
              handleRef={editorHandle}
              nameHint={content.title || null}
            />
          ) : mode === "changes" && diffBlocks ? (
            <TrackedBody blocks={diffBlocks} />
          ) : (
            body
          )}
        </div>
        {iconPop && (
          <div
            data-review-popover
            className="fixed z-[60] w-64 border border-rule-dark bg-paper p-3 shadow-lg"
            style={{
              top: iconPop.top - window.scrollY,
              left: Math.max(8, iconPop.left - window.scrollX),
            }}
            onPointerLeave={() => {
              if (!iconPop.pinned) setIconPop(null);
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              {iconPop.author}
              {iconPop.time ? ` · ${iconPop.time}` : ""}
              {iconPop.pinned ? " · Pinned" : ""}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm">{iconPop.body}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {iconPop.id && iconPop.id !== "pending" && (
                <button
                  type="button"
                  className="text-[10px] font-semibold uppercase tracking-wider text-accent underline"
                  onClick={() => {
                    const id = iconPop.id;
                    setIconPop(null);
                    focusThread(id);
                  }}
                >
                  Open in list
                </button>
              )}
              {iconPop.pinned && (
                <button
                  type="button"
                  className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft underline"
                  onClick={() => setIconPop(null)}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </article>

      {/* Mobile: always-visible path into the comments list */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule-dark bg-paper/95 px-3 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={jumpToComments}
          className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink">
            Comments
          </span>
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-accent">
            View ↓
          </span>
        </button>
      </div>

      <aside className="pb-20 lg:sticky lg:top-4 lg:self-start lg:pb-0">
        {canMoveDesk && sections.length > 0 && (
          <div className="mb-5 border border-rule-dark p-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Section
            </label>
            <select
              value={sectionId}
              disabled={deskBusy || busy}
              onChange={(e) => {
                const next = e.target.value;
                setSectionId(next);
                void moveDesk(next);
              }}
              className="mt-1.5 w-full border border-rule-dark bg-paper px-2 py-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <h2
          id="review-thread"
          className="text-xs font-bold uppercase tracking-wider text-ink-soft"
        >
          Comments
        </h2>
        {savedFlash && (
          <p className="mt-2 border border-rule-dark bg-gray-50 px-3 py-2 text-sm text-ink">
            {savedFlash}{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                if (activeHighlightId && activeHighlightId !== "pending") {
                  focusThread(activeHighlightId);
                } else {
                  document
                    .getElementById("review-thread")
                    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
              }}
            >
              Show in list
            </button>
          </p>
        )}
        <div className="mt-3 max-h-[min(70vh,36rem)] space-y-3 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
          {comments.length === 0 && (
            <p className="text-sm text-ink-soft">No comments yet.</p>
          )}
          {comments.map((c) => {
            const mine = c.author_id === userId;
            const done = !!c.resolved;
            const canMutate = mine || canReview;
            const quoteMissing =
              !!c.anchor?.quote && !done && missedIds.includes(c.id);
            const { relative, absolute } = formatReviewTimestamp(c.created_at);
            return (
              <div
                key={c.id}
                id={`review-c-${c.id}`}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (
                    t.closest("button") ||
                    t.closest("textarea") ||
                    t.closest("a")
                  ) {
                    return;
                  }
                  focusThread(c.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    focusThread(c.id);
                  }
                }}
                className={`border p-3 text-sm ${
                  done
                    ? "border-rule bg-gray-50/60 opacity-70"
                    : mine
                      ? "border-ink/30 bg-gray-50"
                      : "border-rule-dark"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    {mine ? "You" : c.profiles?.display_name} · {relative}
                    <span className="font-normal"> · {absolute}</span>
                    {done ? " · Resolved" : ""}
                    {!c.anchor?.quote ? " · General note" : ""}
                    {quoteMissing ? " · Quote not in draft" : ""}
                  </p>
                  {((canReview || isAuthor) || canMutate) && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        aria-label="Comment actions"
                        aria-expanded={menuOpenId === c.id}
                        aria-haspopup="menu"
                        className="flex h-7 w-7 items-center justify-center text-ink-soft hover:text-ink"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId((id) => (id === c.id ? null : c.id));
                        }}
                      >
                        <IconMoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpenId === c.id && (
                        <>
                          <button
                            type="button"
                            aria-label="Close menu"
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(null);
                            }}
                          />
                          <div
                            role="menu"
                            className="absolute right-0 top-8 z-50 min-w-[9rem] border border-rule-dark bg-paper py-1 shadow-lg"
                          >
                            {(canReview || isAuthor) && (
                              <button
                                type="button"
                                role="menuitem"
                                className="block w-full px-3 py-2 text-left text-[12px] font-semibold hover:bg-gray-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  void toggleResolved(c.id, !done);
                                }}
                              >
                                {done ? "Reopen" : "Resolve"}
                              </button>
                            )}
                            {canMutate && mine && editingId !== c.id && (
                              <button
                                type="button"
                                role="menuitem"
                                className="block w-full px-3 py-2 text-left text-[12px] font-semibold hover:bg-gray-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  setEditingId(c.id);
                                  setEditBody(c.body);
                                }}
                              >
                                Edit
                              </button>
                            )}
                            {canMutate && (
                              <button
                                type="button"
                                role="menuitem"
                                className="block w-full px-3 py-2 text-left text-[12px] font-semibold text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  void removeComment(c.id);
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {c.anchor?.quote && (
                  <button
                    type="button"
                    onClick={() => focusThread(c.id)}
                    className="mt-1.5 block w-full border-l-2 border-yellow-400 bg-yellow-50 px-2 py-1 text-left text-xs italic hover:bg-yellow-100"
                  >
                    “{c.anchor.quote}”
                  </button>
                )}
                {editingId === c.id ? (
                  <div className="mt-1.5 space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full border border-rule-dark px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !editBody.trim()}
                        onClick={() => void saveEdit(c.id)}
                        className="text-[11px] font-semibold uppercase tracking-wide text-ink underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody("");
                        }}
                        className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap">{c.body}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          {quote && (
            <p className="mb-2 flex items-start justify-between gap-2 border-l-2 border-yellow-400 bg-yellow-50 px-2 py-1 text-xs italic">
              <span>“{quote}”</span>
              <button
                type="button"
                onClick={clearPendingHighlight}
                className="not-italic text-ink-soft"
                aria-label="Clear highlight"
              >
                ×
              </button>
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={quote ? "Comment on the highlight…" : "Write a comment…"}
            className="w-full border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void post()}
            disabled={busy || !text.trim()}
            className="mt-2 w-full border border-ink py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-40"
          >
            Save comment
          </button>
        </div>

        {error && (
          <p className="mt-3 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        {canMakeLive && (
          <div className="mt-5 flex flex-col gap-2 border-t border-rule pt-5">
            <p className="text-[11px] text-ink-soft">
              Approved copy — not on the public site yet. Only an editor can make
              it live.
            </p>
            <button
              type="button"
              onClick={() => void act("make_live")}
              disabled={busy}
              className="bg-green-700 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-green-800 disabled:opacity-50"
            >
              Make live
            </button>
          </div>
        )}

        {canReview && (
          <div className="mt-5 flex flex-col gap-2 border-t border-rule pt-5">
            <button
              type="button"
              onClick={() => void act("approve")}
              disabled={busy}
              className="bg-green-700 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-green-800 disabled:opacity-50"
            >
              {isRevision ? "Approve edit" : "Approve & publish"}
            </button>
            {!isRevision && (
              <button
                type="button"
                onClick={() => void act("park")}
                disabled={busy}
                className="border border-sky-700 py-3 text-xs font-semibold uppercase tracking-wider text-sky-800 hover:bg-sky-700 hover:text-white disabled:opacity-50"
              >
                Approve & park
              </button>
            )}
            {assignedEditorIsMe && (
              <button
                type="button"
                onClick={() => void act("changes")}
                disabled={busy}
                className="border border-ink py-3 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                Request changes
              </button>
            )}
          </div>
        )}

        {isAuthor && canEditBody && (
          <button
            type="button"
            onClick={() => void submitRevisions()}
            disabled={busy}
            className="mt-5 block w-full bg-accent py-3 text-center text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Submit revisions
          </button>
        )}

        {isAuthor && state !== "awaiting_editor" && (
          <Link
            href={`/admin/articles/${articleId}/edit`}
            className={
              canEditBody
                ? "mt-2 block border border-ink py-3 text-center text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper"
                : "mt-5 block bg-accent py-3 text-center text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover"
            }
          >
            {canEditBody
              ? "Open full editor (title, cover, section)"
              : state === "awaiting_writer"
                ? "Revise & resubmit"
                : "Edit"}
          </Link>
        )}
      </aside>
    </div>
  );
}
