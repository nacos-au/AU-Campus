"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, btn } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import type { CampusFact } from "@/lib/types";

export function FactsManager() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: facts = [], isLoading } = useQuery({
    queryKey: ["admin-campus-facts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campus_facts")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as CampusFact[];
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-campus-facts"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!question.trim() || !answer.trim()) {
        throw new Error("Question and answer are required.");
      }
      const sort_order =
        facts.reduce((max, f) => Math.max(max, f.sort_order), 0) + 1;
      const { error } = await supabase.from("campus_facts").insert({
        question: question.trim(),
        answer: answer.trim(),
        sort_order,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setQuestion("");
      setAnswer("");
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("campus_facts")
        .update({ active: vars.active, updated_at: new Date().toISOString() })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campus_facts").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return (
    <div>
      <PageHeader
        title="Fun facts"
        description="Campus “Did you know?” trivia. Active facts rotate daily — add as many as you like."
      />

      <div className="space-y-3 border border-rule bg-gray-50/60 p-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Question
          </span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm"
            placeholder="Where did Achievers begin before Owo?"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Answer
          </span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className={btn.primary}
        >
          Add fact
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
          {facts.map((f) => (
            <li key={f.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-serif font-bold text-ink">{f.question}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.answer}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  {f.active ? "Active" : "Hidden"} · order {f.sort_order}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={() =>
                    toggle.mutate({ id: f.id, active: !f.active })
                  }
                >
                  {f.active ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Delete fact?",
                        body: "This removes it from the rotation permanently.",
                      })
                    ) {
                      remove.mutate(f.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {facts.length === 0 && (
            <li className="p-6 text-center text-sm text-ink-soft">No facts yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
