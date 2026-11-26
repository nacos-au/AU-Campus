"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconChevronDown } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  COMMENT_LIMITS,
  COMMENT_SORTS,
  parseCommentAnchor,
  type CommentData,
  type CommentMeta,
  type CommentPage,
  type CommentSort,
} from "@/lib/comments";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { useDismiss } from "./useDismiss";

function mergeById(prev: CommentData[], next: CommentData[]): CommentData[] {
  const seen = new Set(prev.map((c) => c.id));
  return [...prev, ...next.filter((c) => !seen.has(c.id))];
}

/**
 * Closed by default so a busy story never swamps the page. The brand-colour
 * button reveals the discussion, five top-level comments at a time.
 */
export function CommentsSection({
  articleId,
  title,
}: {
  articleId: string;
  title: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [meta, setMeta] = useState<CommentMeta | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<CommentSort>("newest");
  const [items, setItems] = useState<CommentData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState<CommentData | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const rootRef = useRef<HTMLElement>(null);
  useDismiss(sortRef, sortOpen, () => setSortOpen(false));

  // Meta (count, lock, viewer state). Silently hides if the DB feature is absent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_comment_meta", {
        p_article_id: articleId,
      });
      if (cancelled) return;
      if (error || !data) {
        setUnavailable(true);
        return;
      }
      setMeta(data as CommentMeta);
    })().catch(() => !cancelled && setUnavailable(true));
    return () => {
      cancelled = true;
    };
  }, [supabase, articleId]);

  const fetchPage = useCallback(
    async (nextSort: CommentSort, offset: number, replace: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("list_article_comments", {
        p_article_id: articleId,
        p_sort: nextSort,
        p_limit: COMMENT_LIMITS.pageSize,
        p_offset: offset,
      });
      if (id !== requestId.current) return; // a newer request superseded this one
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      const page = data as CommentPage;
      setTotal(page.total);
      setItems((prev) => (replace ? page.items : mergeById(prev, page.items)));
      setLoaded(true);
    },
    [supabase, articleId]
  );

  // Permalink: #c-<id> opens the section and pins that comment.
  useEffect(() => {
    if (!meta) return;
    const target = parseCommentAnchor(window.location.hash);
    if (!target) return;
    (async () => {
      const { data } = await supabase.rpc("get_article_comment", {
        p_comment_id: target,
      });
      const c = data as CommentData | null;
      if (c && c.article_id === articleId) {
        setPinned(c);
        setOpen(true);
        void fetchPage("newest", 0, true);
        requestAnimationFrame(() =>
          rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
    })().catch(() => {});
  }, [meta, supabase, articleId, fetchPage]);

  function openSection() {
    setOpen(true);
    if (!loaded && !loading) void fetchPage(sort, 0, true);
  }

  function changeSort(next: CommentSort) {
    setSortOpen(false);
    if (next === sort) return;
    setSort(next);
    setItems([]);
    setLoaded(false);
    void fetchPage(next, 0, true);
  }

  function updateItem(next: CommentData) {
    setItems((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    setPinned((p) => (p && p.id === next.id ? next : p));
  }

  function posted(item: CommentData) {
    if (item.status !== "held") {
      setMeta((m) => (m ? { ...m, count: m.count + 1 } : m));
    }
    // Reload from the top, newest first, so paging offsets stay correct and the
    // new comment is the first thing the author sees.
    setSort("newest");
    setItems([]);
    setLoaded(false);
    void fetchPage("newest", 0, true);
  }

  function clearPin() {
    setPinned(null);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  if (unavailable) return null;

  if (!meta) {
    return (
      <div
        className="mt-10 h-[52px] animate-pulse bg-rule/50"
        aria-hidden
      />
    );
  }

  if (meta.locked && meta.count === 0) return null;

  const count = meta.count;
  const shown = items.filter((c) => !pinned || c.id !== pinned.id);
  const remaining = Math.max(0, total - items.length);

  if (!open) {
    return (
      <section ref={rootRef} className="mt-10" aria-label="Comments">
        <button
          type="button"
          onClick={openSection}
          className="w-full bg-accent px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {count > 0
            ? `Read ${count.toLocaleString()} comment${count === 1 ? "" : "s"}`
            : "Join the discussion"}
        </button>
      </section>
    );
  }

  const sortLabel = COMMENT_SORTS.find((s) => s.value === sort)?.label ?? "Newest";

  return (
    <section ref={rootRef} className="mt-10" aria-label="Comments">
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-4">
        <h2 className="font-serif text-2xl font-bold">
          Discussion
          {count > 0 && (
            <span className="ml-2 text-base font-normal text-ink-soft">
              {count.toLocaleString()}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link
            href="/guidelines"
            className="text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Guidelines
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Hide
          </button>
        </div>
      </div>

      <div className="mt-4">
        <CommentComposer articleId={articleId} meta={meta} onPosted={posted} />
      </div>

      <div className="mt-6 flex items-center justify-between border-b border-rule pb-3">
        <div ref={sortRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
          >
            Sort by: <span className="font-semibold text-ink">{sortLabel}</span>
            <IconChevronDown className="h-4 w-4" />
          </button>
          {sortOpen && (
            <ul
              role="listbox"
              className="absolute left-0 z-20 mt-1 w-40 border border-rule-dark bg-paper py-1 shadow-lg"
            >
              {COMMENT_SORTS.map((s) => (
                <li key={s.value} role="option" aria-selected={s.value === sort}>
                  <button
                    type="button"
                    onClick={() => changeSort(s.value)}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-accent-soft ${
                      s.value === sort ? "font-semibold text-accent" : "text-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {total > 0 && (
          <span className="text-xs text-ink-soft tabular-nums">
            {Math.min(items.length, total)} of {total.toLocaleString()}
          </span>
        )}
      </div>

      {pinned && (
        <div className="mt-5 border-l-4 border-accent pl-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Linked comment
            </p>
            <button
              type="button"
              onClick={clearPin}
              className="text-xs font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              View all comments
            </button>
          </div>
          <CommentItem
            comment={pinned}
            meta={meta}
            articleTitle={title}
            isReply={Boolean(pinned.parent_id)}
            highlight
            onUpdate={updateItem}
            onDeleted={() => {
              setPinned(null);
              setItems((prev) => prev.filter((c) => c.id !== pinned.id));
            }}
          />
        </div>
      )}

      <div className="divide-y divide-rule">
        {shown.map((c) => (
          <div key={c.id} className="py-5">
            <CommentItem
              comment={c}
              meta={meta}
              articleTitle={title}
              onUpdate={updateItem}
              onDeleted={() => updateItem({ ...c, deleted: true, body: "" })}
            />
          </div>
        ))}
      </div>

      {loading && (
        <p className="py-6 text-center text-sm text-ink-soft">Loading comments…</p>
      )}
      {error && (
        <p className="py-4 text-center text-sm text-red-700">
          {error}{" "}
          <button
            type="button"
            onClick={() => fetchPage(sort, items.length, items.length === 0)}
            className="underline"
          >
            Try again
          </button>
        </p>
      )}
      {loaded && !loading && items.length === 0 && !error && (
        <p className="py-8 text-center text-sm text-ink-soft">
          No comments yet. Be the first to add one.
        </p>
      )}

      {!loading && remaining > 0 && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => fetchPage(sort, items.length, false)}
            className="border border-ink px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
          >
            Show {Math.min(COMMENT_LIMITS.pageSize, remaining)} more
          </button>
        </div>
      )}
    </section>
  );
}
