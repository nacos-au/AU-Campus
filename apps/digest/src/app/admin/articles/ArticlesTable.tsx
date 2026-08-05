"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ArticleStatus, ArticleWithMeta } from "@/lib/types";

const STATUS_STYLES: Record<ArticleStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

const FILTERS: ("all" | ArticleStatus)[] = [
  "all",
  "draft",
  "submitted",
  "published",
  "rejected",
];

export function ArticlesTable({
  isStaff,
  userId,
}: {
  isStaff: boolean;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | ArticleStatus>("all");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, sections(slug, name), profiles(display_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ArticleWithMeta[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (vars: {
      id: string;
      status: ArticleStatus;
      featured?: boolean;
      editorNote?: string | null;
    }) => {
      const patch: Record<string, unknown> = { status: vars.status };
      if (vars.status === "published") patch.published_at = new Date().toISOString();
      if (vars.featured !== undefined) patch.featured = vars.featured;
      if (vars.editorNote !== undefined) patch.editor_note = vars.editorNote;
      const { error } = await supabase
        .from("articles")
        .update(patch)
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const toggleFeatured = useMutation({
    mutationFn: async (vars: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("articles")
        .update({ featured: vars.featured })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const visible = articles.filter(
    (a) => filter === "all" || a.status === filter
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold">
          {isStaff ? "All Articles" : "My Articles"}
        </h1>
        <Link
          href="/admin/articles/new"
          className="bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors"
        >
          New article
        </Link>
      </div>

      <div className="mt-5 flex gap-2 border-b border-rule pb-3 text-xs font-semibold">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 uppercase tracking-wide transition-colors ${
              filter === f
                ? "bg-ink text-paper"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-soft">
          No articles here yet.
        </p>
      ) : (
        <div className="divide-y divide-rule">
          {visible.map((a) => {
            const canEdit =
              isStaff || (a.author_id === userId && a.status !== "published");
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif font-bold">
                    {a.featured && (
                      <span className="mr-1.5 align-middle text-accent" title="Featured (front page lead)">★</span>
                    )}
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {a.sections?.name} · {a.profiles?.display_name} ·{" "}
                    {new Date(a.updated_at).toLocaleString()}
                  </p>
                  {a.status === "rejected" && a.editor_note && (
                    <p className="mt-1 text-xs text-red-700">
                      Editor: {a.editor_note}
                    </p>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[a.status]}`}
                >
                  {a.status}
                </span>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  {a.status === "published" && (
                    <Link
                      href={`/article/${a.slug}`}
                      className="text-ink-soft underline hover:text-ink"
                    >
                      View
                    </Link>
                  )}
                  {canEdit && (
                    <Link
                      href={`/admin/articles/${a.id}/edit`}
                      className="text-ink-soft underline hover:text-ink"
                    >
                      Edit
                    </Link>
                  )}

                  {/* Writer: submit a draft */}
                  {!isStaff &&
                    a.author_id === userId &&
                    (a.status === "draft" || a.status === "rejected") && (
                      <button
                        onClick={() =>
                          updateStatus.mutate({ id: a.id, status: "submitted" })
                        }
                        className="bg-ink px-2.5 py-1 text-paper hover:bg-accent transition-colors"
                      >
                        Submit for review
                      </button>
                    )}

                  {/* Editor: publish / reject / feature */}
                  {isStaff && a.status === "submitted" && (
                    <>
                      <button
                        onClick={() => {
                          if (
                            !confirm(
                              `Admin action: publish "${a.title}"?\n\nThis makes the article live on AU Digest.`
                            )
                          )
                            return;
                          updateStatus.mutate({ id: a.id, status: "published" });
                        }}
                        className="bg-green-700 px-2.5 py-1 text-white hover:bg-green-800 transition-colors"
                      >
                        Publish
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt(
                            "Optional note to the writer (why is this rejected?)"
                          );
                          if (note === null) return;
                          updateStatus.mutate({
                            id: a.id,
                            status: "rejected",
                            editorNote: note.trim() || null,
                          });
                        }}
                        className="bg-red-700 px-2.5 py-1 text-white hover:bg-red-800 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {isStaff && a.status === "published" && (
                    <>
                      <button
                        onClick={() =>
                          toggleFeatured.mutate({
                            id: a.id,
                            featured: !a.featured,
                          })
                        }
                        className="border border-ink px-2.5 py-1 hover:bg-ink hover:text-paper transition-colors"
                      >
                        {a.featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        onClick={() => {
                          if (
                            !confirm(
                              `Admin action: unpublish "${a.title}"?\n\nReaders will no longer see this story.`
                            )
                          )
                            return;
                          updateStatus.mutate({ id: a.id, status: "draft" });
                        }}
                        className="text-ink-soft underline hover:text-ink"
                      >
                        Unpublish
                      </button>
                    </>
                  )}

                  {(isStaff || (a.author_id === userId && a.status === "draft")) && (
                    <button
                      onClick={() => {
                        if (confirm(`Admin action: permanently delete "${a.title}"?`)) remove.mutate(a.id);
                      }}
                      className="text-red-700 underline hover:text-red-900"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
