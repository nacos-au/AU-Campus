"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, btn } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import type { CampusWord } from "@/lib/types";

export function WordsManager() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: words = [], isLoading } = useQuery({
    queryKey: ["admin-campus-words"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campus_words")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as CampusWord[];
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-campus-words"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!word.trim() || !definition.trim()) {
        throw new Error("Word and definition are required.");
      }
      const sort_order =
        words.reduce((max, w) => Math.max(max, w.sort_order), 0) + 1;
      const { error } = await supabase.from("campus_words").insert({
        word: word.trim(),
        definition: definition.trim(),
        example: example.trim() || null,
        sort_order,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setWord("");
      setDefinition("");
      setExample("");
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("campus_words")
        .update({ active: vars.active, updated_at: new Date().toISOString() })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campus_words").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return (
    <div>
      <PageHeader
        title="Word of the Day"
        description="Pool of words that rotate daily on the site and Weekly Issue."
      />

      <div className="space-y-3 border border-rule bg-gray-50/60 p-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Word
          </span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Definition
          </span>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            rows={2}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Example (optional)
          </span>
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className={btn.primary}
        >
          Add word
        </button>
      </div>

      {error && (
        <p className="mt-3 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule border border-rule bg-white">
          {words.map((w) => (
            <li
              key={w.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-serif text-lg font-bold text-ink">{w.word}</p>
                <p className="mt-1 text-sm text-ink-soft">{w.definition}</p>
                {w.example ? (
                  <p className="mt-1 text-sm italic text-ink/70">“{w.example}”</p>
                ) : null}
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  {w.active ? "Active" : "Hidden"} · order {w.sort_order}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={() =>
                    toggle.mutate({ id: w.id, active: !w.active })
                  }
                >
                  {w.active ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Delete word?",
                        body: "This removes it from the rotation permanently.",
                      })
                    ) {
                      remove.mutate(w.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {words.length === 0 && (
            <li className="p-6 text-center text-sm text-ink-soft">No words yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
