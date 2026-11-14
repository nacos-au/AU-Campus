"use client";

import { useConfirm } from "@/components/ConfirmDialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { RichText } from "@/components/RichText";
import type { ReviewComment, RevisionPayload } from "@/lib/types";

const STATE_LABELS: Record<string, string> = {
  draft: "Draft",
  awaiting_editor: "Awaiting editor",
  awaiting_writer: "Awaiting writer",
  published: "Live",
};

function applyHighlights(root: HTMLElement, quotes: string[]) {
  root.querySelectorAll("mark[data-review]").forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent ?? ""));
  });
  root.normalize();
  for (const q of quotes) {
    if (!q) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const text = n.nodeValue ?? "";
      const i = text.indexOf(q);
      if (i === -1) continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(n, i + q.length);
      const mark = document.createElement("mark");
      mark.dataset.review = "1";
      mark.className = "bg-yellow-200";
      range.surroundContents(mark);
      break;
    }
  }
}

export function ReviewClient({
  articleId,
  content,
  state,
  isRevision,
  canReview,
  isAuthor,
  userId,
  initialComments,
}: {
  articleId: string;
  content: RevisionPayload;
  state: string;
  isRevision: boolean;
  canReview: boolean;
  isAuthor: boolean;
  userId: string;
  initialComments: ReviewComment[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const qc = useQueryClient();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embargoLocal, setEmbargoLocal] = useState("");
  const { confirm } = useConfirm();

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
  const quotes = comments.map((c) => c.anchor?.quote ?? "").filter(Boolean);
  const quoteKey = quotes.join("\u0000");

  useEffect(() => {
    if (bodyRef.current) applyHighlights(bodyRef.current, quotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  function captureSelection() {
    const sel = window.getSelection();
    const t = sel?.toString().trim();
    if (
      t &&
      sel?.anchorNode &&
      bodyRef.current?.contains(sel.anchorNode) &&
      t.length <= 400
    ) {
      setQuote(t);
    }
  }

  async function post() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("add_review_comment", {
      p_article_id: articleId,
      p_body: text,
      p_anchor: quote ? { quote } : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setText("");
    setQuote(null);
    qc.invalidateQueries({ queryKey: ["review-comments", articleId] });
  }

  async function act(kind: "changes" | "approve") {
    const embargoIso =
      kind === "approve" && embargoLocal
        ? new Date(embargoLocal).toISOString()
        : null;
    const embargoFuture =
      embargoIso && new Date(embargoIso).getTime() > Date.now();

    const ok = await confirm(
      kind === "approve"
        ? embargoFuture
          ? {
              title: "Approve with embargo?",
              body: `The story stays off the public site until ${new Date(
                embargoIso!
              ).toLocaleString()}. Editors can still open it in the newsroom.`,
              confirmLabel: "Set embargo",
            }
          : isRevision
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
      kind === "approve"
        ? await supabase.rpc("review_approve", {
            p_article_id: articleId,
            ...(embargoFuture ? { p_embargo_at: embargoIso } : {}),
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Review thread
        </h2>
        <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-ink-soft">No comments yet.</p>
          )}
          {comments.map((c) => {
            const mine = c.author_id === userId;
            return (
              <div
                key={c.id}
                className={`border p-3 text-sm ${
                  mine ? "border-ink/30 bg-gray-50" : "border-rule-dark"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {mine ? "You" : c.profiles?.display_name} ·{" "}
                  {new Date(c.created_at).toLocaleString()}
                </p>
                {c.anchor?.quote && (
                  <p className="mt-1.5 border-l-2 border-yellow-400 bg-yellow-50 px-2 py-1 text-xs italic">
                    “{c.anchor.quote}”
                  </p>
                )}
                <p className="mt-1.5 whitespace-pre-wrap">{c.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          {quote && (
            <p className="mb-2 flex items-start justify-between gap-2 border-l-2 border-yellow-400 bg-yellow-50 px-2 py-1 text-xs italic">
              <span>“{quote}”</span>
              <button
                onClick={() => setQuote(null)}
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
            onClick={post}
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

        {canReview && (
          <div className="mt-5 flex flex-col gap-2 border-t border-rule pt-5">
            {!isRevision && (
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Embargo (optional)
                <input
                  type="datetime-local"
                  value={embargoLocal}
                  onChange={(e) => setEmbargoLocal(e.target.value)}
                  className="mt-1 w-full border border-rule-dark px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink"
                />
                <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-ink-soft">
                  Leave empty to publish now. Future time = hold off the public site until then.
                </span>
              </label>
            )}
            <button
              onClick={() => act("approve")}
              disabled={busy}
              className="bg-green-700 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-green-800 disabled:opacity-50"
            >
              {embargoLocal && !isRevision
                ? "Approve with embargo"
                : "Approve & publish"}
            </button>
            {!isAuthor && (
              <button
                onClick={() => act("changes")}
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
