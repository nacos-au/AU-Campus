"use client";

import { PageHeader, btn, input } from "@/components/admin/ui";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ArticleWithMeta, FrontPageKind, FrontPageSlot, Section } from "@/lib/types";

const KINDS: { kind: FrontPageKind; label: string; slots: number }[] = [
  { kind: "page_one", label: "Page one (lead)", slots: 1 },
  { kind: "breaking", label: "Breaking", slots: 5 },
  { kind: "top_news", label: "Top news", slots: 5 },
];

export function FrontPageManager() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["front-page-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("front_page_slots")
        .select("id, kind, article_id, section_id, position, updated_at")
        .order("position");
      if (error) throw error;
      return data as FrontPageSlot[];
    },
  });

  const { data: published = [] } = useQuery({
    queryKey: ["front-page-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id, title, slug, section_id, status, cover_url, sections(slug, name)"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data as unknown as ArticleWithMeta[];
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["sections-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as Section[];
    },
  });

  const setSlot = useMutation({
    mutationFn: async (vars: {
      kind: FrontPageKind;
      articleId: string;
      position: number;
      sectionId?: number | null;
    }) => {
      if (
        vars.kind === "page_one" ||
        vars.kind === "top_news" ||
        vars.kind === "section_highlight"
      ) {
        const row = published.find((a) => a.id === vars.articleId);
        if (!row?.cover_url?.trim()) {
          throw new Error(
            "Cover art is required for featured homepage placements."
          );
        }
      }
      const { error } = await supabase.rpc("set_front_page_slot", {
        p_kind: vars.kind,
        p_article_id: vars.articleId,
        p_position: vars.position,
        p_section_id: vars.sectionId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setError(null);
      setNotice("Front page updated");
      qc.invalidateQueries({ queryKey: ["front-page-slots"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const clearSlot = useMutation({
    mutationFn: async (vars: {
      kind: FrontPageKind;
      position?: number | null;
      sectionId?: number | null;
    }) => {
      const { error } = await supabase.rpc("clear_front_page_slot", {
        p_kind: vars.kind,
        p_position: vars.position ?? null,
        p_section_id: vars.sectionId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setError(null);
      setNotice("Slot cleared");
      qc.invalidateQueries({ queryKey: ["front-page-slots"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function titleFor(id: string) {
    return published.find((a) => a.id === id)?.title ?? id.slice(0, 8);
  }

  function slotAt(kind: FrontPageKind, position: number) {
    return slots.find((s) => s.kind === kind && s.position === position);
  }

  return (
    <div>
      <PageHeader
        title="Front page"
        description="Curate page one, breaking, top news, and one highlight per desk. Only published stories can be placed."
      />

      {(error || notice) && (
        <p
          className={`mb-4 border px-3 py-2 text-sm ${
            error
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {error ?? notice}
        </p>
      )}

      {slotsLoading ? (
        <p className="text-sm text-ink-soft">Loading slots…</p>
      ) : (
        <div className="space-y-8">
          {KINDS.map(({ kind, label, slots: n }) => (
            <section key={kind} className="border border-rule p-4">
              <h2 className="font-serif text-lg font-bold">{label}</h2>
              <div className="mt-3 space-y-3">
                {Array.from({ length: n }, (_, i) => i + 1).map((pos) => {
                  const cur = slotAt(kind, pos);
                  const key = `${kind}:${pos}`;
                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center gap-2 border-t border-rule pt-3 first:border-t-0 first:pt-0"
                    >
                      <span className="w-8 text-xs font-bold text-ink-soft">
                        #{pos}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm">
                        {cur ? titleFor(cur.article_id) : "Empty"}
                      </p>
                      <select
                        className={input + " max-w-xs"}
                        value={pick[key] ?? ""}
                        onChange={(e) =>
                          setPick((p) => ({ ...p, [key]: e.target.value }))
                        }
                      >
                        <option value="">Choose story…</option>
                        {published.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={btn.secondary}
                        disabled={!pick[key] || setSlot.isPending}
                        onClick={() =>
                          setSlot.mutate({
                            kind,
                            articleId: pick[key],
                            position: pos,
                          })
                        }
                      >
                        Set
                      </button>
                      {cur && (
                        <button
                          type="button"
                          className={btn.ghost}
                          disabled={clearSlot.isPending}
                          onClick={() =>
                            clearSlot.mutate({ kind, position: pos })
                          }
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="border border-rule p-4">
            <h2 className="font-serif text-lg font-bold">Section highlights</h2>
            <p className="mt-1 text-sm text-ink-soft">
              One featured story per desk on the homepage section blocks.
            </p>
            <div className="mt-3 space-y-3">
              {sections.map((sec) => {
                const cur = slots.find(
                  (s) =>
                    s.kind === "section_highlight" && s.section_id === sec.id
                );
                const key = `section:${sec.id}`;
                return (
                  <div
                    key={sec.id}
                    className="flex flex-wrap items-center gap-2 border-t border-rule pt-3"
                  >
                    <span className="w-28 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      {sec.name}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm">
                      {cur ? titleFor(cur.article_id) : "Empty"}
                    </p>
                    <select
                      className={input + " max-w-xs"}
                      value={pick[key] ?? ""}
                      onChange={(e) =>
                        setPick((p) => ({ ...p, [key]: e.target.value }))
                      }
                    >
                      <option value="">Choose story…</option>
                      {published
                        .filter((a) => a.section_id === sec.id)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className={btn.secondary}
                      disabled={!pick[key] || setSlot.isPending}
                      onClick={() =>
                        setSlot.mutate({
                          kind: "section_highlight",
                          articleId: pick[key],
                          position: 1,
                          sectionId: sec.id,
                        })
                      }
                    >
                      Set
                    </button>
                    {cur && (
                      <button
                        type="button"
                        className={btn.ghost}
                        disabled={clearSlot.isPending}
                        onClick={() =>
                          clearSlot.mutate({
                            kind: "section_highlight",
                            sectionId: sec.id,
                          })
                        }
                      >
                        Clear
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
