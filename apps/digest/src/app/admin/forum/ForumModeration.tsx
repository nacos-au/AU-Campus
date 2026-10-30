"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ForumCategory, ForumPost, ForumThread } from "@/lib/types";

export function ForumModeration() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ["forum-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as ForumCategory[];
    },
  });

  const hiddenThreads = useQuery({
    queryKey: ["forum-hidden-threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_threads")
        .select("*, profiles(display_name, username)")
        .eq("status", "hidden")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ForumThread[];
    },
  });

  const hiddenPosts = useQuery({
    queryKey: ["forum-hidden-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*, profiles(display_name, username)")
        .eq("status", "hidden")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ForumPost[];
    },
  });

  const filters = useQuery({
    queryKey: ["forum-filters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_filters")
        .select("id, phrase")
        .order("phrase");
      if (error) throw error;
      return data as { id: number; phrase: string }[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["forum-hidden-threads"] });
    queryClient.invalidateQueries({ queryKey: ["forum-hidden-posts"] });
    queryClient.invalidateQueries({ queryKey: ["forum-filters"] });
  };

  const moderate = useMutation({
    mutationFn: async (vars: {
      targetType: "thread" | "post";
      targetId: string;
      status: "visible" | "removed";
    }) => {
      const { error } = await supabase.rpc("moderate_forum_content", {
        p_target_type: vars.targetType,
        p_target_id: vars.targetId,
        p_status: vars.status,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  const addPhrase = useMutation({
    mutationFn: async () => {
      const next = phrase.trim().toLowerCase();
      if (next.length < 2) throw new Error("Enter a word or phrase.");
      const { error } = await supabase.from("forum_filters").insert({ phrase: next });
      if (error) throw error;
    },
    onSuccess: () => {
      setPhrase("");
      setError(null);
      refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const removePhrase = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("forum_filters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-bold">Forum</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hidden posts stay off the forum until an editor restores or removes them.
          Three reports, or a filtered word, hide a post automatically.
        </p>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider">Hidden queue</h2>
        <ul className="mt-3 divide-y divide-rule">
          {(hiddenThreads.data ?? []).map((thread) => (
            <li key={thread.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">Thread: {thread.title}</p>
                <p className="text-xs text-ink-soft">{thread.profiles?.display_name}</p>
              </div>
              <ModerationButtons
                onRestore={() =>
                  moderate.mutate({ targetType: "thread", targetId: thread.id, status: "visible" })
                }
                onRemove={() =>
                  moderate.mutate({ targetType: "thread", targetId: thread.id, status: "removed" })
                }
              />
            </li>
          ))}
          {(hiddenPosts.data ?? []).map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">Reply</p>
                <p className="max-w-xl text-sm text-ink-soft">{post.body}</p>
              </div>
              <ModerationButtons
                onRestore={() =>
                  moderate.mutate({ targetType: "post", targetId: post.id, status: "visible" })
                }
                onRemove={() =>
                  moderate.mutate({ targetType: "post", targetId: post.id, status: "removed" })
                }
              />
            </li>
          ))}
          {(hiddenThreads.data ?? []).length + (hiddenPosts.data ?? []).length === 0 && (
            <li className="py-4 text-sm text-ink-soft">Nothing is waiting.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider">Word list</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addPhrase.mutate();
          }}
        >
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Phrase to hide on sight"
            className="min-w-0 flex-1 border border-rule-dark px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-wider text-paper"
          >
            Add
          </button>
        </form>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(filters.data ?? []).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => removePhrase.mutate(item.id)}
                className="border border-rule-dark px-2 py-1 text-xs"
              >
                {item.phrase} ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider">Categories</h2>
        <ul className="mt-3 text-sm">
          {(categories.data ?? []).map((category) => (
            <li key={category.id} className="py-1">
              {category.name}
              <span className="text-ink-soft"> · /forum/{category.slug}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ModerationButtons({
  onRestore,
  onRemove,
}: {
  onRestore: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 text-xs font-semibold">
      <button type="button" onClick={onRestore} className="bg-green-700 px-2.5 py-1 text-white">
        Restore
      </button>
      <button type="button" onClick={onRemove} className="bg-red-700 px-2.5 py-1 text-white">
        Remove
      </button>
    </div>
  );
}
