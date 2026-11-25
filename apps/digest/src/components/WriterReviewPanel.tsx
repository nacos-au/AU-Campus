"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatReviewTimestamp } from "@/lib/review-highlights";
import type { ReviewComment } from "@/lib/types";

/** Comments panel for writers revising after request-changes. */
export function WriterReviewPanel({
  articleId,
  userId,
}: {
  articleId: string;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["review-comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_review_comments")
        .select("*, profiles(display_name)")
        .eq("article_id", articleId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as ReviewComment[];
    },
  });

  const openCount = comments.filter((c) => !c.resolved).length;

  async function toggleResolved(id: string, resolved: boolean) {
    setError(null);
    const { error } = await supabase.rpc("resolve_review_comment", {
      p_comment_id: id,
      p_resolved: resolved,
    });
    if (error) setError(error.message);
    else qc.invalidateQueries({ queryKey: ["review-comments", articleId] });
  }

  if (isLoading) {
    return (
      <div className="border border-rule-dark bg-gray-50 px-4 py-3 text-sm text-ink-soft">
        Loading editor comments…
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="border border-rule-dark bg-gray-50 px-4 py-3 text-sm text-ink-soft">
        No editor comments yet.{" "}
        <Link
          href={`/admin/review/${articleId}`}
          className="font-semibold text-accent underline underline-offset-2"
        >
          Open full review
        </Link>{" "}
        for version history.
      </div>
    );
  }

  return (
    <div className="border border-rule-dark bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Editor comments · {openCount} open
          </p>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            Address these, then send back for review.
          </p>
        </div>
        <Link
          href={`/admin/review/${articleId}#review-thread`}
          className="text-[11px] font-semibold uppercase tracking-wider text-accent underline underline-offset-2"
        >
          Open full review
        </Link>
      </div>
      <ul className="max-h-64 divide-y divide-rule overflow-y-auto">
        {comments.map((c) => {
          const { relative, absolute } = formatReviewTimestamp(c.created_at);
          const done = !!c.resolved;
          return (
            <li
              key={c.id}
              className={`px-4 py-3 text-sm ${done ? "opacity-60" : ""}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                {c.author_id === userId
                  ? "You"
                  : (c.profiles?.display_name ?? "Editor")}
                {" · "}
                {relative}
                <span className="font-normal"> · {absolute}</span>
                {done ? " · Resolved" : ""}
                {!c.anchor?.quote ? " · General note" : ""}
              </p>
              {c.anchor?.quote && (
                <Link
                  href={`/admin/review/${articleId}#review-c-${c.id}`}
                  className="mt-1 block border-l-2 border-yellow-400 bg-yellow-50 px-2 py-1 text-xs italic hover:bg-yellow-100"
                >
                  “{c.anchor.quote}”
                </Link>
              )}
              <p className="mt-1.5 whitespace-pre-wrap">{c.body}</p>
              <button
                type="button"
                onClick={() => void toggleResolved(c.id, !done)}
                className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft underline hover:text-ink"
              >
                {done ? "Reopen" : "Mark addressed"}
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="border-t border-accent/30 bg-accent-soft px-4 py-2 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
