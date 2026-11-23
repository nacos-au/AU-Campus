"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
      setMsg(next ? "Saved to your library." : "Removed from saved.");
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
      <button
        onClick={toggleLike}
        aria-pressed={liked}
        className={`flex items-center gap-2 border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
          liked
            ? "border-accent bg-accent text-white"
            : "border-ink hover:bg-ink hover:text-paper"
        }`}
      >
        <span aria-hidden>{liked ? "♥" : "♡"}</span>
        {liked ? "Liked" : "Like"} · {likes}
      </button>
      <button
        onClick={toggleSave}
        aria-pressed={saved}
        className={`border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
          saved
            ? "border-ink bg-ink text-paper"
            : "border-ink hover:bg-ink hover:text-paper"
        }`}
      >
        {saved ? "Saved" : "Save"}
      </button>
      <button
        onClick={share}
        className="border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-ink hover:text-paper"
      >
        Share
      </button>
      {msg && <span className="text-xs text-ink-soft">{msg}</span>}
    </div>
  );
}
