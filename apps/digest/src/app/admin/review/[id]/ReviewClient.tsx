"use client";

import { useConfirm } from "@/components/ConfirmDialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { RichText } from "@/components/RichText";
import {
  applyReviewHighlights,
  scrollToReviewHighlight,
  type HighlightSpec,
} from "@/lib/review-highlights";
import type { ReviewComment, RevisionPayload, Section } from "@/lib/types";

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
  const { confirm } = useConfirm();

  const showSelfAssignTools = isSuperAdmin && adminModeOn;

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

  const body = useMemo(() => <RichText doc={content.body} />, [content.body]);

  const highlightSpecs: HighlightSpec[] = useMemo(() => {
    const specs: HighlightSpec[] = comments
      .filter((c) => !c.resolved && c.anchor?.quote)
      .map((c) => ({
        id: c.id,
        quote: c.anchor!.quote!,
        prefix: c.anchor?.prefix ?? null,
        suffix: c.anchor?.suffix ?? null,
      }));
    if (quote && activeHighlightId === "pending") {
      specs.unshift({
        id: "pending",
        quote,
        prefix: quotePrefix,
        suffix: quoteSuffix,
      });
    }
    return specs;
  }, [comments, quote, quotePrefix, quoteSuffix, activeHighlightId]);

  const quoteKey = highlightSpecs
    .map((s) => `${s.id}:${s.quote}:${s.prefix ?? ""}:${s.suffix ?? ""}`)
    .join("\u0000");

  useEffect(() => {
    if (!bodyRef.current) return;
    applyReviewHighlights(bodyRef.current, highlightSpecs);
    if (activeHighlightId && activeHighlightId !== "pending") {
      scrollToReviewHighlight(bodyRef.current, activeHighlightId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, activeHighlightId]);

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
    const sel = window.getSelection();
    const t = sel?.toString().trim();
    if (
      t &&
      sel?.anchorNode &&
      bodyRef.current?.contains(sel.anchorNode) &&
      t.length <= 400
    ) {
      const full = bodyRef.current.innerText || "";
      const i = full.indexOf(t);
      const prefix = i >= 0 ? full.slice(Math.max(0, i - 24), i) : "";
      const suffix =
        i >= 0 ? full.slice(i + t.length, i + t.length + 24) : "";
      setQuote(t);
      setQuotePrefix(prefix || null);
      setQuoteSuffix(suffix || null);
      setActiveHighlightId("pending");
    }
  }

  async function post() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("add_review_comment", {
      p_article_id: articleId,
      p_body: text,
      p_anchor: quote
        ? { quote, prefix: quotePrefix, suffix: quoteSuffix }
        : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setText("");
    clearPendingHighlight();
    qc.invalidateQueries({ queryKey: ["review-comments", articleId] });
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
    <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
        <h1 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">
          {content.title}
        </h1>
        {content.dek && (
          <p className="mt-3 font-serif text-xl text-ink-soft">{content.dek}</p>
        )}
        {content.byline && (
          <p className="mt-3 text-sm font-semibold">By {content.byline}</p>
        )}
        {content.cover_url && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden">
            <Image src={content.cover_url} alt="" fill className="object-cover" />
          </div>
        )}
        <div
          ref={bodyRef}
          onMouseUp={captureSelection}
          onTouchEnd={captureSelection}
          className="mt-6"
        >
          {body}
        </div>
      </article>

      <aside className="lg:sticky lg:top-4 lg:self-start">
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
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {state === "published"
                ? "Move desk updates the live story immediately."
                : "Change desk here — no need to open Edit."}
            </p>
          </div>
        )}

        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Review thread
        </h2>
        <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-ink-soft">No comments yet.</p>
          )}
          {comments.map((c) => {
            const mine = c.author_id === userId;
            const done = !!c.resolved;
            const canMutate = mine || canReview;
            return (
              <div
                key={c.id}
                id={`review-c-${c.id}`}
                className={`border p-3 text-sm ${
                  done
                    ? "border-rule bg-gray-50/60 opacity-70"
                    : mine
                      ? "border-ink/30 bg-gray-50"
                      : "border-rule-dark"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {mine ? "You" : c.profiles?.display_name} ·{" "}
                  {new Date(c.created_at).toLocaleString()}
                  {done ? " · Resolved" : ""}
                </p>
                {c.anchor?.quote && (
                  <button
                    type="button"
                    onClick={() => setActiveHighlightId(c.id)}
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
                <div className="mt-2 flex flex-wrap gap-3">
                  {(canReview || isAuthor) && (
                    <button
                      type="button"
                      onClick={() => toggleResolved(c.id, !done)}
                      className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft underline hover:text-ink"
                    >
                      {done ? "Reopen" : "Resolve"}
                    </button>
                  )}
                  {canMutate && mine && editingId !== c.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditBody(c.body);
                      }}
                      className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft underline hover:text-ink"
                    >
                      Edit
                    </button>
                  )}
                  {canMutate && (
                    <button
                      type="button"
                      onClick={() => void removeComment(c.id)}
                      className="text-[11px] font-semibold uppercase tracking-wide text-red-700 underline hover:text-red-900"
                    >
                      Remove
                    </button>
                  )}
                </div>
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
            Send comment
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

        {isAuthor && state !== "awaiting_editor" && (
          <Link
            href={`/admin/articles/${articleId}/edit`}
            className="mt-5 block bg-accent py-3 text-center text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover"
          >
            {state === "awaiting_writer" ? "Revise & resubmit" : "Edit"}
          </Link>
        )}
      </aside>
    </div>
  );
}
