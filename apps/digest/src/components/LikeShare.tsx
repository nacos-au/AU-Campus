"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconBookmark, IconHeart, IconShare } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

const btnBase =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

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
    const clipboard = title.trim() ? `${title.trim()}\n${url}` : url;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
        return;
      }
      await navigator.clipboard.writeText(clipboard);
      setMsg("Link copied.");
    } catch {
      /* user dismissed */
    }
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-1 border-y border-rule py-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className={btnBase}
        >
          <IconHeart
            className="h-6 w-6"
            fill={liked ? "currentColor" : "none"}
            strokeWidth={1.75}
          />
        </button>
        <span className="min-w-[1ch] pr-2 text-xs font-semibold tabular-nums text-ink-soft">
          {likes}
        </span>
      </div>
      <button
        type="button"
        onClick={share}
        aria-label="Share"
        className={btnBase}
      >
        <IconShare className="h-6 w-6" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save"}
        className={btnBase}
      >
        <IconBookmark
          className="h-6 w-6"
          fill={saved ? "currentColor" : "none"}
          strokeWidth={1.75}
        />
      </button>
      {msg && <span className="ml-2 text-xs text-ink-soft">{msg}</span>}
      {saved && !msg && (
        <Link
          href="/account/saved"
          className="ml-2 text-xs font-semibold text-ink-soft underline hover:text-ink"
        >
          View saved
        </Link>
      )}
    </div>
  );
}
