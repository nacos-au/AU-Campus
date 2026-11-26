"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  COMMENT_LIMITS,
  type CommentData,
  type CommentMeta,
} from "@/lib/comments";

export function CommentComposer({
  articleId,
  meta,
  parentId = null,
  replyingTo = null,
  autoFocus = false,
  onPosted,
  onCancel,
}: {
  articleId: string;
  meta: CommentMeta;
  /** Set to reply; the DB keeps replies one level deep. */
  parentId?: string | null;
  replyingTo?: string | null;
  autoFocus?: boolean;
  onPosted: (item: CommentData) => void;
  onCancel?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isReply = parentId !== null;
  const max = isReply ? COMMENT_LIMITS.replyMax : COMMENT_LIMITS.commentMax;
  const trimmed = body.trim();
  const tooShort = trimmed.length < COMMENT_LIMITS.minChars;

  if (meta.locked) {
    return (
      <p className="border border-rule bg-accent-soft px-4 py-3 text-sm text-ink-soft">
        Comments are closed on this story.
      </p>
    );
  }

  if (!meta.signed_in) {
    const next = encodeURIComponent(pathname || "/");
    return (
      <p className="border border-rule bg-accent-soft px-4 py-3 text-sm text-ink-soft">
        <Link
          href={`/login?next=${next}`}
          className="font-semibold text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          Sign in to {isReply ? "reply" : "comment"}
        </Link>{" "}
        . Everyone with an account can take part.
      </p>
    );
  }

  if (meta.suspended) {
    return (
      <p className="border border-rule bg-accent-soft px-4 py-3 text-sm text-ink-soft">
        Commenting is paused on your account
        {meta.suspended_until
          ? ` until ${new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(meta.suspended_until))}`
          : ""}
        .
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error } = await supabase.rpc("post_article_comment", {
      p_article_id: articleId,
      p_body: trimmed,
      p_parent_id: parentId,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    const item = data as CommentData;
    setBody("");
    if (item.status === "held") {
      setNotice(
        "Thanks. Your comment is awaiting editor review. Only you can see it until then."
      );
    }
    onPosted(item);
  }

  return (
    <form onSubmit={submit} className={isReply ? "mt-3" : ""}>
      {replyingTo && (
        <p className="mb-1 text-xs text-ink-soft">
          Replying to <span className="font-semibold text-ink">{replyingTo}</span>
        </p>
      )}
      <label className="sr-only" htmlFor={`composer-${parentId ?? "root"}`}>
        {isReply ? "Write a reply" : "Write a comment"}
      </label>
      <textarea
        id={`composer-${parentId ?? "root"}`}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, max))}
        rows={isReply ? 2 : 3}
        autoFocus={autoFocus}
        placeholder={isReply ? "Write a reply…" : "Add to the discussion…"}
        className="block w-full resize-y border border-rule-dark bg-white px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-soft/70 focus:border-ink focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-ink-soft">
          Be respectful.{" "}
          <Link
            href="/guidelines"
            className="underline underline-offset-2 hover:text-ink"
            target="_blank"
          >
            See guidelines
          </Link>
          <span className="ml-3 tabular-nums">
            {body.length}/{max}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={tooShort || busy}
            className="bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Posting…" : isReply ? "Reply" : "Post comment"}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-2 text-sm text-ink-soft">{notice}</p>}
    </form>
  );
}
