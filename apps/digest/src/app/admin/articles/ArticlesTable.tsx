"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ArticleStatus, ArticleWithMeta } from "@/lib/types";

interface Row extends ArticleWithMeta {
  article_revisions:
    | { state: string; assigned_editor_id: string | null }
    | { state: string; assigned_editor_id: string | null }[]
    | null;
}

const STATUS_STYLES: Record<ArticleStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  awaiting_editor: "bg-amber-100 text-amber-800",
  awaiting_writer: "bg-red-100 text-red-700",
  published: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  awaiting_editor: "With editor",
  awaiting_writer: "Needs changes",
  published: "Live",
};

type Filter = "all" | "review" | ArticleStatus;

const ARTICLE_SELECT =
  "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username), assignee:profiles!articles_assigned_editor_id_fkey(display_name), article_revisions(state, assigned_editor_id)";

function revisionOf(a: Row) {
  const r = a.article_revisions;
  return Array.isArray(r) ? (r[0] ?? null) : r;
}

export function ArticlesTable({
  isStaff,
  isAdmin,
  userId,
}: {
  isStaff: boolean;
  isAdmin: boolean;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_SELECT)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-articles"] });

  const unpublish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("articles")
        .update({ status: "draft" })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const toggleFeatured = useMutation({
    mutationFn: async (vars: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("articles")
        .update({ featured: vars.featured })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const reassign = useMutation({
    mutationFn: async (vars: { id: string; editorId: string }) => {
      const { error } = await supabase
        .from("articles")
        .update({ assigned_editor_id: vars.editorId })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const editorsQuery = useQuery({
    queryKey: ["newsroom-editors"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, is_super_admin")
        .or("role.eq.editor,role.eq.admin,is_super_admin.eq.true")
        .order("display_name");
      if (error) throw error;
      return data as { id: string; display_name: string }[];
    },
  });
  const editors = editorsQuery.data ?? [];

  /** Effective state shown to the reader of this list. */
  function effective(a: Row): { status: ArticleStatus; revision: boolean } {
    const r = revisionOf(a);
    if (a.status === "published" && r && r.state !== "draft") {
      return {
        status: r.state as ArticleStatus,
        revision: true,
      };
    }
    return { status: a.status, revision: false };
  }

  function awaitingMe(a: Row) {
    const r = revisionOf(a);
    if (r?.state === "awaiting_editor") {
      return r.assigned_editor_id === userId && a.author_id !== userId;
    }
    return (
      a.status === "awaiting_editor" &&
      a.assigned_editor_id === userId &&
      a.author_id !== userId
    );
  }

  const reviewCount = articles.filter(awaitingMe).length;

  const visible = articles.filter((a) => {
    if (filter === "all") return true;
    if (filter === "review") return awaitingMe(a);
    return effective(a).status === filter || a.status === filter;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...(isStaff
      ? [{ id: "review" as Filter, label: `Needs my review (${reviewCount})` }]
      : []),
    { id: "draft", label: "Drafts" },
    { id: "awaiting_editor", label: "With editor" },
    { id: "awaiting_writer", label: "Needs changes" },
    { id: "published", label: "Live" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">
          {isStaff ? "All articles" : "My articles"}
        </h1>
        <Link
          href="/admin/articles/new"
          className="bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors"
        >
          New article
        </Link>
      </div>

      <div className="-mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-rule px-4 pb-3 text-xs font-semibold [scrollbar-width:none] sm:mx-0 sm:px-0">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 uppercase tracking-wide transition-colors ${
              filter === f.id
                ? "bg-ink text-paper"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-soft">
          Nothing here yet.
        </p>
      ) : (
        <div className="divide-y divide-rule">
          {visible.map((a) => {
            const eff = effective(a);
            const mine = a.author_id === userId;
            const canEdit = isStaff || (mine && eff.status !== "awaiting_editor");
            const review = awaitingMe(a);
            return (
              <div key={a.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg font-bold leading-snug sm:truncate">
                      {a.featured && (
                        <span className="mr-1.5 text-accent" title="Featured">
                          ★
                        </span>
                      )}
                      {a.title || "Untitled"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {a.sections?.name} ·{" "}
                      {a.byline || a.profiles?.display_name}
                      {a.assignee?.display_name
                        ? ` · editor ${a.assignee.display_name}`
                        : ""}
                      <span className="hidden sm:inline">
                        {" "}
                        · {new Date(a.updated_at).toLocaleString()}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[eff.status]}`}
                  >
                    {eff.revision ? "Edit · " : ""}
                    {STATUS_LABELS[eff.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
                  {review && (
                    <Link
                      href={`/admin/review/${a.id}`}
                      className="bg-accent px-3 py-1.5 text-white hover:bg-accent-hover"
                    >
                      Review
                    </Link>
                  )}
                  {!review && (a.status !== "draft" || eff.revision) && (
                    <Link
                      href={`/admin/review/${a.id}`}
                      className="text-ink-soft underline hover:text-ink"
                    >
                      Feedback
                    </Link>
                  )}
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

                  {isAdmin &&
                    a.status === "awaiting_editor" &&
                    a.author_id !== userId && (
                      <select
                        value={a.assigned_editor_id ?? ""}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          reassign.mutate({ id: a.id, editorId: e.target.value });
                        }}
                        className="border border-rule-dark px-2 py-1 text-xs"
                      >
                        <option value="">Reassign…</option>
                        {editors
                          .filter((p) => p.id !== a.author_id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.display_name}
                            </option>
                          ))}
                      </select>
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
                          if (!confirm(`Unpublish "${a.title}"?`)) return;
                          unpublish.mutate(a.id);
                        }}
                        className="text-ink-soft underline hover:text-ink"
                      >
                        Unpublish
                      </button>
                    </>
                  )}

                  {(isStaff || (mine && a.status === "draft")) && (
                    <button
                      onClick={() => {
                        if (confirm(`Permanently delete "${a.title}"?`))
                          remove.mutate(a.id);
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
