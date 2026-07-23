"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/articles";
import type { Section } from "@/lib/types";

export function SectionsManager() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as Section[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-sections"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Section name is required.");
      const slug = slugify(name);
      const position =
        sections.reduce((max, s) => Math.max(max, s.position), 0) + 1;
      const { error } = await supabase
        .from("sections")
        .insert({ name: name.trim(), slug, position });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const rename = useMutation({
    mutationFn: async (vars: { id: number; name: string }) => {
      const { error } = await supabase
        .from("sections")
        .update({ name: vars.name })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const move = useMutation({
    mutationFn: async (vars: { id: number; position: number }) => {
      const { error } = await supabase
        .from("sections")
        .update({ position: vars.position })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (e: Error) =>
      setError(
        e.message.includes("foreign") || e.message.includes("violates")
          ? "Remove or reassign articles in this section before deleting it."
          : e.message
      ),
    onSettled: invalidate,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Sections</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Newsroom desks that appear in the nav and footer's section list — News,
        Sports, Opinion, and the rest.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 border border-rule-dark p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New section name"
          className="min-w-[16rem] flex-1 border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          Add section
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
        <div className="mt-6 divide-y divide-rule">
          {sections.map((s, index) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <input
                defaultValue={s.name}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== s.name)
                    rename.mutate({ id: s.id, name: next });
                }}
                className="min-w-[10rem] flex-1 border border-transparent px-2 py-1 font-semibold hover:border-rule-dark focus:border-ink focus:outline-none"
              />
              <span className="text-xs uppercase tracking-wider text-ink-soft">
                /{s.slug}
              </span>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  disabled={index === 0}
                  onClick={() => {
                    const prev = sections[index - 1];
                    if (!prev) return;
                    move.mutate({ id: s.id, position: prev.position });
                    move.mutate({ id: prev.id, position: s.position });
                  }}
                  className="border border-rule-dark px-2 py-1 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  disabled={index === sections.length - 1}
                  onClick={() => {
                    const next = sections[index + 1];
                    if (!next) return;
                    move.mutate({ id: s.id, position: next.position });
                    move.mutate({ id: next.id, position: s.position });
                  }}
                  className="border border-rule-dark px-2 py-1 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete section "${s.name}"? Stories that use it must be moved first.`
                      )
                    )
                      remove.mutate(s.id);
                  }}
                  className="text-red-700 underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
