"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconHeart, IconShare } from "@/components/icons";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { createClient } from "@/lib/supabase/client";
import {
  COMMENT_LIMITS,
  MODERATION_EMAIL,
  commentAnchor,
  relativeTime,
  type CommentData,
  type CommentMeta,
  type CommentPage,
} from "@/lib/comments";
import { CommentComposer } from "./CommentComposer";
import { CommentMenu } from "./CommentMenu";

function mergeById(prev: CommentData[], next: CommentData[]): CommentData[] {
  const seen = new Set(prev.map((c) => c.id));
  return [...prev, ...next.filter((c) => !seen.has(c.id))];
}

const actionBtn =
  "inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:text-ink disabled:cursor-default disabled:opacity-50 disabled:hover:text-ink-soft";

export function CommentItem({
  comment,
  meta,
  articleTitle,
  isReply = false,
  highlight = false,
  onUpdate,
  onDeleted,
  onReplyPosted,
}: {
  comment: CommentData;
  meta: CommentMeta;
  articleTitle: string;
  isReply?: boolean;
  highlight?: boolean;
  onUpdate: (c: CommentData) => void;
  onDeleted: () => void;
  /** Replies hand new replies to their thread so they land in one list. */
  onReplyPosted?: (c: CommentData) => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [showCollapsed, setShowCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [replies, setReplies] = useState<CommentData[]>([]);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesTotal, setRepliesTotal] = useState<number | null>(null);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const max = isReply ? COMMENT_LIMITS.replyMax : COMMENT_LIMITS.commentMax;
  const live = !comment.deleted && comment.status !== "removed";
  const canInteract =
    live && (comment.status === "visible" || comment.status === "collapsed");
  const canReply = canInteract && !meta.locked;
  const profileHref =
    comment.badge && comment.author_username
      ? `/author/${comment.author_username}`
      : null;

  async function toggleLike() {
    if (!meta.signed_in) {
      setMsg("Sign in to like comments.");
      return;
    }
    const was = comment.liked_by_me;
    onUpdate({
      ...comment,
      liked_by_me: !was,
      like_count: Math.max(0, comment.like_count + (was ? -1 : 1)),
    });
    const { data, error } = await supabase.rpc("toggle_comment_like", {
      p_comment_id: comment.id,
    });
    if (error) {
      onUpdate({ ...comment, liked_by_me: was, like_count: comment.like_count });
      setMsg(error.message);
      return;
    }
    const res = data as { liked: boolean; like_count: number };
    onUpdate({ ...comment, liked_by_me: res.liked, like_count: res.like_count });
  }

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}#${commentAnchor(comment.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${comment.author_name} on ${articleTitle}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied.");
    } catch {
      /* dismissed */
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editBusy) return;
    setEditBusy(true);
    setEditError(null);
    const { data, error } = await supabase.rpc("edit_article_comment", {
      p_comment_id: comment.id,
      p_body: editBody.trim(),
    });
    setEditBusy(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    onUpdate(data as CommentData);
    setEditing(false);
  }

  async function loadReplies(offset: number) {
    setRepliesLoading(true);
    setRepliesError(null);
    const { data, error } = await supabase.rpc("list_comment_replies", {
      p_parent_id: comment.id,
      p_limit: COMMENT_LIMITS.pageSize,
      p_offset: offset,
    });
    setRepliesLoading(false);
    if (error) {
      setRepliesError(error.message);
      return;
    }
    const page = data as CommentPage;
    setRepliesTotal(page.total);
    setReplies((prev) => mergeById(prev, page.items));
  }

  function toggleReplies() {
    const next = !repliesOpen;
    setRepliesOpen(next);
    if (next && replies.length === 0) void loadReplies(0);
  }

  function appendReply(item: CommentData) {
    setReplies((prev) => mergeById(prev, [item]));
    setRepliesOpen(true);
    setRepliesTotal((t) => (t ?? comment.reply_count) + 1);
    onUpdate({ ...comment, reply_count: comment.reply_count + 1 });
  }

  function posted(item: CommentData) {
    setReplying(false);
    if (isReply && onReplyPosted) onReplyPosted(item);
    else appendReply(item);
  }

  const total = repliesTotal ?? comment.reply_count;
  const remaining = Math.max(0, total - replies.length);

  return (
    <div
      id={commentAnchor(comment.id)}
      className={`scroll-mt-24 ${highlight ? "bg-accent-soft p-3 ring-1 ring-accent/30" : ""}`}
    >
      <div className="flex gap-3">
        <div className="pt-0.5">
          {profileHref ? (
            <Link href={profileHref} tabIndex={-1} aria-hidden>
              <ProfileAvatar
                url={comment.author_avatar}
                name={comment.author_name}
                size="sm"
              />
            </Link>
          ) : (
            <ProfileAvatar
              url={comment.author_avatar}
              name={comment.author_name}
              size="sm"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="font-semibold text-ink hover:text-accent"
                >
                  {comment.author_name}
                </Link>
              ) : (
                <span className="font-semibold text-ink">{comment.author_name}</span>
              )}
              {comment.badge && (
                <span className="border border-accent/40 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-accent">
                  {comment.badge === "editor" ? "Editor" : "Writer"}
                </span>
              )}
              <span className="text-xs text-ink-soft">
                {relativeTime(comment.created_at)}
                {comment.edited_at && " · edited"}
              </span>
            </div>
            {!comment.deleted && (
              <CommentMenu
                comment={comment}
                meta={meta}
                onUpdate={onUpdate}
                onDeleted={onDeleted}
                onEdit={() => {
                  setEditBody(comment.body);
                  setEditing(true);
                }}
                notify={setMsg}
              />
            )}
          </div>

          {isReply && comment.reply_to_name && live && (
            <p className="mt-0.5 text-xs text-ink-soft">
              Replying to{" "}
              <span className="font-semibold">{comment.reply_to_name}</span>
            </p>
          )}

          {/* Body */}
          <div className="mt-1.5">
            {comment.deleted ? (
              <p className="text-sm italic text-ink-soft">Deleted by author</p>
            ) : comment.status === "removed" ? (
              <p className="text-sm italic text-ink-soft">
                Removed by moderators
                {comment.removed_reason ? `: ${comment.removed_reason}` : ""}.
                {MODERATION_EMAIL && (
                  <>
                    {" "}
                    <a
                      href={`mailto:${MODERATION_EMAIL}?subject=${encodeURIComponent("Comment appeal")}`}
                      className="not-italic underline underline-offset-2 hover:text-ink"
                    >
                      Appeal
                    </a>
                  </>
                )}
              </p>
            ) : editing ? (
              <form onSubmit={saveEdit}>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value.slice(0, max))}
                  rows={3}
                  autoFocus
                  className="block w-full resize-y border border-rule-dark bg-white px-3 py-2 text-[15px] leading-relaxed focus:border-ink focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs tabular-nums text-ink-soft">
                    {editBody.length}/{max}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        editBusy ||
                        editBody.trim().length < COMMENT_LIMITS.minChars
                      }
                      className="bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-40"
                    >
                      {editBusy ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
                {editError && (
                  <p className="mt-2 text-sm text-red-700">{editError}</p>
                )}
              </form>
            ) : comment.status === "collapsed" && !showCollapsed ? (
              <button
                type="button"
                onClick={() => setShowCollapsed(true)}
                className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Collapsed for review. Show comment
              </button>
            ) : (
              <>
                {comment.status === "held" && (
                  <p className="mb-1 inline-block bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Awaiting editor review
                  </p>
                )}
                {/* Plain text only: links stay inert on purpose. */}
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">
                  {comment.body}
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          {live && !editing && (
            <div className="mt-1 flex flex-wrap items-center gap-x-5">
              <button
                type="button"
                onClick={toggleLike}
                disabled={!canInteract || comment.is_mine}
                aria-pressed={comment.liked_by_me}
                aria-label={comment.liked_by_me ? "Unlike" : "Like"}
                title={comment.is_mine ? "You can't like your own comment" : undefined}
                className={`${actionBtn} ${comment.liked_by_me ? "!text-accent" : ""}`}
              >
                <IconHeart
                  className="h-4 w-4"
                  fill={comment.liked_by_me ? "currentColor" : "none"}
                />
                <span className="tabular-nums">{comment.like_count}</span>
              </button>
              {canReply && (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  className={actionBtn}
                >
                  Reply
                </button>
              )}
              <button type="button" onClick={share} className={actionBtn}>
                <IconShare className="h-4 w-4" />
                Share
              </button>
            </div>
          )}

          {msg && <p className="mt-1 text-xs text-ink-soft">{msg}</p>}

          {replying && canReply && (
            <CommentComposer
              articleId={comment.article_id}
              meta={meta}
              parentId={comment.id}
              replyingTo={comment.author_name}
              autoFocus
              onPosted={posted}
              onCancel={() => setReplying(false)}
            />
          )}

          {/* Replies (top-level only) */}
          {!isReply && (comment.reply_count > 0 || replies.length > 0) && (
            <div className="mt-2">
              <button
                type="button"
                onClick={toggleReplies}
                aria-expanded={repliesOpen}
                className="text-xs font-semibold text-accent hover:text-accent-hover"
              >
                {repliesOpen
                  ? "Hide replies"
                  : `View ${comment.reply_count} ${comment.reply_count === 1 ? "reply" : "replies"}`}
              </button>

              {repliesOpen && (
                <div className="mt-3 space-y-4 border-l-2 border-rule pl-4">
                  {replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      meta={meta}
                      articleTitle={articleTitle}
                      isReply
                      onReplyPosted={appendReply}
                      onUpdate={(next) =>
                        setReplies((prev) =>
                          prev.map((x) => (x.id === next.id ? next : x))
                        )
                      }
                      onDeleted={() => {
                        setReplies((prev) => prev.filter((x) => x.id !== r.id));
                        setRepliesTotal((t) => Math.max(0, (t ?? total) - 1));
                        onUpdate({
                          ...comment,
                          reply_count: Math.max(0, comment.reply_count - 1),
                        });
                      }}
                    />
                  ))}
                  {repliesLoading && (
                    <p className="text-xs text-ink-soft">Loading replies…</p>
                  )}
                  {repliesError && (
                    <p className="text-xs text-red-700">{repliesError}</p>
                  )}
                  {!repliesLoading && remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => loadReplies(replies.length)}
                      className="text-xs font-semibold text-accent hover:text-accent-hover"
                    >
                      Show {Math.min(COMMENT_LIMITS.pageSize, remaining)} more{" "}
                      {Math.min(COMMENT_LIMITS.pageSize, remaining) === 1
                        ? "reply"
                        : "replies"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
