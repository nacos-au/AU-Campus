"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function NewThreadForm({
  categoryId,
  canStart,
}: {
  categoryId: number;
  canStart: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!canStart) {
    return (
      <p className="mt-8 border border-rule bg-[#fafafa] px-4 py-3 text-sm text-ink-soft">
        You can reply now. Starting a thread unlocks after your reputation reaches 10,
        or if you are an editor.
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_forum_thread", {
      p_category_id: categoryId,
      p_title: title,
      p_body: body,
    });
    setPending(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (data) router.push(`/forum/t/${data}`);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3 border-t border-rule pt-6">
      <h2 className="font-serif text-xl font-bold">New thread</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
        className="w-full border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What do you want to ask?"
        required
        rows={4}
        className="w-full border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
      />
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent disabled:opacity-50"
      >
        {pending ? "Posting…" : "Post thread"}
      </button>
    </form>
  );
}

export function ReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("create_forum_reply", {
      p_thread_id: threadId,
      p_body: body,
    });
    setPending(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3 border-t border-rule pt-6">
      <h2 className="font-serif text-xl font-bold">Reply</h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={4}
        className="w-full border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
      />
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent disabled:opacity-50"
      >
        {pending ? "Replying…" : "Reply"}
      </button>
    </form>
  );
}

export function VoteReport({
  targetType,
  targetId,
  score,
}: {
  targetType: "thread" | "post";
  targetId: string;
  score: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function vote(value: 1 | -1) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("cast_forum_vote", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_value: value,
    });
    setPending(false);
    if (rpcError) setError(rpcError.message);
    else router.refresh();
  }

  async function report() {
    const reason = window.prompt("Why should an editor look at this?") ?? "";
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("report_forum_content", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: reason,
    });
    setPending(false);
    if (rpcError) setError(rpcError.message);
    else router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
      <span className="text-ink-soft">{score} points</span>
      <button type="button" disabled={pending} onClick={() => vote(1)} className="hover:text-accent">
        Upvote
      </button>
      <button type="button" disabled={pending} onClick={() => vote(-1)} className="hover:text-accent">
        Downvote
      </button>
      <button type="button" disabled={pending} onClick={report} className="text-ink-soft hover:text-ink">
        Flag for review
      </button>
      {error && <span className="text-accent">{error}</span>}
    </div>
  );
}
