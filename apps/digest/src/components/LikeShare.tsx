"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const btnBase =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-6.5-4.35-9.33-8.5C.8 9.6 2.1 5.75 5.6 4.6c1.9-.63 3.95-.1 5.4 1.35C12.45 4.5 14.5 3.97 16.4 4.6c3.5 1.15 4.8 5 2.93 7.9C18.5 16.65 12 21 12 21z"
      />
    </svg>
  );
}

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75v15.5L12 16.5l-6 3.75V4.75z"
      />
    </svg>
  );
}

function IconShare() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="18" cy="5" r="2.25" />
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="18" cy="19" r="2.25" />
      <path strokeLinecap="round" d="M8.2 13.1 15.8 17M15.8 7 8.2 10.9" />
    </svg>
  );
}

function tone(active: boolean) {
  return active
    ? "border-ink bg-ink text-paper"
    : "border-ink bg-paper text-ink hover:bg-ink hover:text-paper";
}

export function LikeShare({
  articleId,
  initialLikes,
  title,
}: {
  articleId: string;
  initialLikes: number;
  title: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const [{ data: likeRow }, { data: saveRow }] = await Promise.all([
        supabase
          .from("article_likes")
          .select("article_id")
          .eq("article_id", articleId)
          .maybeSingle(),
        supabase
          .from("article_saves")
          .select("article_id")
          .eq("article_id", articleId)
          .maybeSingle(),
      ]);
      setLiked(!!likeRow);
      setSaved(!!saveRow);
    })().catch(() => {});
  }, [supabase, articleId]);

  async function toggleLike() {
    if (!userId) {
      setMsg("Sign in to like this story.");
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    const { error } = next
      ? await supabase.from("article_likes").insert({ article_id: articleId })
      : await supabase
          .from("article_likes")
          .delete()
          .eq("article_id", articleId)
          .eq("user_id", userId);
    if (error) {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
      setMsg(error.message);
    } else {
      setMsg(null);
    }
  }

  async function toggleSave() {
    if (!userId) {
      setMsg("Sign in to save this story.");
      return;
    }
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("article_saves").insert({ article_id: articleId })
      : await supabase
          .from("article_saves")
          .delete()
          .eq("article_id", articleId)
          .eq("user_id", userId);
    if (error) {
      setSaved(!next);
      setMsg(error.message);
    } else {
      setMsg(null);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied.");
    } catch {
      /* user dismissed */
    }
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-y border-rule py-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className={`${btnBase} ${tone(liked)}`}
        >
          <IconHeart filled={liked} />
        </button>
        <span className="min-w-[1ch] text-xs font-semibold tabular-nums text-ink-soft">
          {likes}
        </span>
      </div>
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save"}
        className={`${btnBase} ${tone(saved)}`}
      >
        <IconBookmark filled={saved} />
      </button>
      <button
        type="button"
        onClick={share}
        aria-label="Share"
        className={`${btnBase} ${tone(false)}`}
      >
        <IconShare />
      </button>
      {msg && <span className="text-xs text-ink-soft">{msg}</span>}
      {saved && !msg && (
        <Link
          href="/account/saved"
          className="text-xs font-semibold text-ink-soft underline hover:text-ink"
        >
          View saved
        </Link>
      )}
    </div>
  );
}
