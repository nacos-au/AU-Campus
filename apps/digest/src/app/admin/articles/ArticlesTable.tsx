"use client";

import { PageHeader, btn } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { digestFeatures, isPublicSectionSlug } from "@/lib/features";
import type { ArticleStatus, ArticleWithMeta, Section } from "@/lib/types";

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
  scheduled: "bg-sky-100 text-sky-800",
  archived: "bg-ink/10 text-ink-soft",
  withdrawn: "bg-red-50 text-red-800",
};

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  awaiting_editor: "With editor",
  awaiting_writer: "Needs changes",
  published: "Live",
  scheduled: "Parked",
  archived: "Archived",
  withdrawn: "Withdrawn",
};

type Filter = "all" | "review" | "shared" | ArticleStatus;

interface SharedClaim {
  article_id: string;
  created_at: string;
  title: string;
  token: string | null;
  mode: string | null;
}

const ARTICLE_SELECT =
  "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username), assignee:profiles!articles_assigned_editor_id_fkey(display_name), article_revisions(state, assigned_editor_id), article_collaborators(user_id, credit_order, profiles(display_name, username))";

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
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") as Filter | null) ?? "all";
  const [filter, setFilter] = useState<Filter>(
    [
      "all",
      "review",
      "shared",
      "draft",
      "awaiting_editor",
      "awaiting_writer",
      "published",
      "scheduled",
      "archived",
      "withdrawn",
    ].includes(initialFilter)
      ? initialFilter
      : "all"
  );
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirm();

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

  const { data: sections = [] } = useQuery({
    queryKey: ["sections-public-desks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return ((data ?? []) as Section[]).filter((s) =>
        isPublicSectionSlug(s.slug)
      );
    },
  });

  const { data: sharedWithMe = [] } = useQuery({
    queryKey: ["article-shares-with-me", userId],
    enabled: digestFeatures.draftShare,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_share_claims")
        .select(
          "article_id, created_at, articles(title), article_share_links(token, mode, revoked_at)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        // Soft-fail before migration is applied
        if (
          error.message.includes("does not exist") ||
          error.code === "42P01" ||
          error.code === "PGRST205"
        ) {
          return [] as SharedClaim[];
        }
        throw error;
      }
      return (data ?? []).map((row) => {
        const r = row as {
          article_id: string;
          created_at: string;
          articles:
            | { title: string }
            | { title: string }[]
            | null;
          article_share_links:
            | { token: string; mode: string; revoked_at: string | null }
            | { token: string; mode: string; revoked_at: string | null }[]
            | null;
        };
        const art = Array.isArray(r.articles) ? r.articles[0] : r.articles;
        const link = Array.isArray(r.article_share_links)
          ? r.article_share_links[0]
          : r.article_share_links;
        return {
          article_id: r.article_id,
          created_at: r.created_at,
          title: art?.title || "Untitled",
          token: link && !link.revoked_at ? link.token : null,
          mode: link?.mode ?? null,
        } satisfies SharedClaim;
      });
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

  const makeLive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("publish_parked_article", {
        p_article_id: id,
      });
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const toggleFeatured = useMutation({
    mutationFn: async (vars: { id: string; featured: boolean }) => {
      if (vars.featured) {
        const row = articles.find((a) => a.id === vars.id);
        if (!row?.cover_url?.trim()) {
          throw new Error(
            "Top News needs a cover photo. Add art in the editor first."
          );
        }
      }
      const { error } = await supabase
        .from("articles")
        .update({ featured: vars.featured })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const toggleBreaking = useMutation({
    mutationFn: async (vars: { id: string; breaking: boolean }) => {
      const { error } = await supabase
        .from("articles")
        .update({ breaking: vars.breaking })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("articles")
        .update({
          status: "archived",
          featured: false,
          breaking: false,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const restore = useMutation({
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

  const removeDraft = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("withdraw_article", {
        p_article_id: id,
        p_reason: null,
      });
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

  const moveDesk = useMutation({
    mutationFn: async (vars: { id: string; sectionId: number }) => {
      const { error } = await supabase.rpc("move_article_desk", {
        p_article_id: vars.id,
        p_section_id: vars.sectionId,
      });
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
        .or("role.eq.editor,role.eq.admin")
        .eq("is_super_admin", false)
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

  function isParty(a: Row) {
    return (
      a.author_id === userId ||
      (a.article_collaborators ?? []).some((c) => c.user_id === userId)
    );
  }

  function awaitingMe(a: Row) {
    const r = revisionOf(a);
    // Include self-assigned (sole-editor failover) — still needs review.
    if (r?.state === "awaiting_editor") {
      return r.assigned_editor_id === userId;
    }
    return a.status === "awaiting_editor" && a.assigned_editor_id === userId;
  }

  /** Writers only see their own/collab queue; staff see the desk. */
  const desk = isStaff
    ? articles
    : articles.filter((a) => isParty(a));

  const reviewCount = desk.filter(awaitingMe).length;

  const visible = desk.filter((a) => {
    if (filter === "shared") return false;
    if (filter === "all") {
      return a.status !== "archived" && a.status !== "withdrawn";
    }
    if (filter === "review") return awaitingMe(a) && a.status !== "archived";
    if (filter === "draft") {
      return a.status === "draft" && isParty(a);
    }
    // Writer-pipeline tabs = your pieces only. Desk queue is “Needs my review”.
    if (filter === "awaiting_editor" || filter === "awaiting_writer") {
      if (!isParty(a)) return false;
      return effective(a).status === filter || a.status === filter;
    }
    return effective(a).status === filter || a.status === filter;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...(isStaff
      ? [{ id: "review" as Filter, label: `Needs my review (${reviewCount})` }]
      : []),
    ...(digestFeatures.draftShare
      ? [
          {
            id: "shared" as Filter,
            label: `Shared with me (${sharedWithMe.length})`,
          },
        ]
      : []),
    { id: "draft", label: "Drafts" },
    { id: "awaiting_editor", label: "With editor" },
    { id: "awaiting_writer", label: "Needs changes" },
    { id: "published", label: "Live" },
    { id: "scheduled", label: "Parked" },
    { id: "archived", label: "Archived" },
    { id: "withdrawn", label: "Withdrawn" },
  ];

  return (
    <div>
      <PageHeader
        title={isStaff ? "Articles" : "My articles"}
        description={
          isStaff
            ? "Everything in the pipeline — drafts, reviews, and what’s live."
            : "Your drafts, what’s with an editor, and what’s live."
        }
        action={
          <Link href="/admin/articles/new" className={btn.primary}>
            + New article
          </Link>
        }
      />

      <div className="-mx-4 -mt-2 flex gap-1 overflow-x-auto border-b border-rule px-4 pb-3 text-xs font-semibold [scrollbar-width:none] sm:mx-0 sm:px-0">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 transition-colors ${
              filter === f.id
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-gray-100 hover:text-ink"
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

      {filter === "shared" ? (
        sharedWithMe.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-soft">
            Nothing shared with you yet.
          </p>
        ) : (
          <div className="divide-y divide-rule">
            {sharedWithMe.map((s) => (
              <div key={s.article_id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg font-bold leading-snug sm:truncate">
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Shared with you ·{" "}
                      {s.mode === "snapshot" ? "Snapshot" : "Live"} ·{" "}
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    View only
                  </span>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/share/view/${s.article_id}`}
                    className="bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : isLoading ? (
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
            const collab = (a.article_collaborators ?? []).some(
              (c) => c.user_id === userId
            );
            const party = mine || collab;
            const canEdit =
              isStaff || (party && eff.status !== "awaiting_editor");
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
                      {a.byline_mode === "alias"
                        ? a.byline || a.profiles?.display_name
                        : [
                            a.profiles?.display_name,
                            ...(a.article_collaborators ?? [])
                              .slice()
                              .sort((x, y) => x.credit_order - y.credit_order)
                              .map((c) => c.profiles?.display_name),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                      {collab && !mine ? " · co-author" : ""}
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
                  {isStaff && a.status === "scheduled" && (
                    <button
                      onClick={async () => {
                        if (
                          await confirm({
                            title: `Make “${a.title}” live?`,
                            body: "Readers will see this story on the site immediately.",
                            confirmLabel: "Make live",
                          })
                        )
                          makeLive.mutate(a.id);
                      }}
                      className="bg-green-700 px-3 py-1.5 text-white hover:bg-green-800"
                    >
                      Make live
                    </button>
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

                  {isStaff &&
                    sections.length > 0 &&
                    a.status !== "withdrawn" &&
                    a.status !== "archived" && (
                      <select
                        value={a.section_id}
                        disabled={moveDesk.isPending}
                        aria-label="Move desk"
                        onChange={async (e) => {
                          const next = Number(e.target.value);
                          if (!next || next === a.section_id) return;
                          const name =
                            sections.find((s) => s.id === next)?.name ??
                            "that desk";
                          if (
                            !(await confirm({
                              title: `Move to ${name}?`,
                              body:
                                a.status === "published"
                                  ? "The live story moves to that section immediately."
                                  : "Updates the desk for this piece.",
                              confirmLabel: "Move desk",
                            }))
                          ) {
                            e.target.value = String(a.section_id);
                            return;
                          }
                          moveDesk.mutate({ id: a.id, sectionId: next });
                        }}
                        className="border border-rule-dark px-2 py-1 text-xs"
                      >
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            Desk: {s.name}
                          </option>
                        ))}
                      </select>
                    )}

                  {isStaff && a.status === "published" && (
                    <>
                      <button
                        onClick={() =>
                          toggleBreaking.mutate({
                            id: a.id,
                            breaking: !a.breaking,
                          })
                        }
                        className="border border-accent px-2.5 py-1 text-accent hover:bg-accent hover:text-white transition-colors"
                      >
                        {a.breaking ? "Unbreak" : "Breaking"}
                      </button>
                      <button
                        onClick={() =>
                          toggleFeatured.mutate({
                            id: a.id,
                            featured: !a.featured,
                          })
                        }
                        title={
                          !a.featured && !a.cover_url?.trim()
                            ? "Add a cover photo before marking Top News"
                            : undefined
                        }
                        className="border border-ink px-2.5 py-1 hover:bg-ink hover:text-paper transition-colors"
                      >
                        {a.featured ? "Unfeature" : "Top News"}
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            await confirm({
                              title: `Unpublish “${a.title}”?`,
                              body: "Readers will no longer see this story. It returns to drafts.",
                              confirmLabel: "Unpublish",
                            })
                          )
                            unpublish.mutate(a.id);
                        }}
                        className="text-ink-soft underline hover:text-ink"
                      >
                        Unpublish
                      </button>
                    </>
                  )}

                  {a.status === "archived" && (isStaff || mine) && (
                    <button
                      onClick={() => restore.mutate(a.id)}
                      className="border border-ink px-2.5 py-1 hover:bg-ink hover:text-paper transition-colors"
                    >
                      Restore to draft
                    </button>
                  )}

                  {mine &&
                    (a.status === "awaiting_editor" ||
                      a.status === "awaiting_writer") && (
                    <button
                      onClick={async () => {
                        if (
                          await confirm({
                            title: `Withdraw “${a.title}”?`,
                            body: "Removes it from the editor queue. The assigned editor will see that you withdrew it. Body content is cleared; an audit row is kept.",
                            confirmLabel: "Withdraw",
                            danger: true,
                          })
                        )
                          withdraw.mutate(a.id);
                      }}
                      className="text-red-700 underline hover:text-red-900"
                    >
                      Withdraw
                    </button>
                  )}

                  {mine && a.status === "draft" && !isStaff && (
                    <button
                      onClick={async () => {
                        if (
                          await confirm({
                            title: `Delete “${a.title}”?`,
                            body: "This permanently removes the draft. It cannot be restored.",
                            confirmLabel: "Delete draft",
                            danger: true,
                          })
                        )
                          removeDraft.mutate(a.id);
                      }}
                      className="text-red-700 underline hover:text-red-900"
                    >
                      Delete
                    </button>
                  )}

                  {a.status !== "archived" &&
                    isStaff && (
                      <button
                        onClick={async () => {
                          if (
                            await confirm({
                              title: `Archive “${a.title}”?`,
                              body: "It leaves the live site but stays in the newsroom so you can restore it later.",
                              confirmLabel: "Archive",
                              danger: true,
                            })
                          )
                            archive.mutate(a.id);
                        }}
                        className="text-red-700 underline hover:text-red-900"
                      >
                        Archive
                      </button>
                    )}

                  {mine && a.status === "draft" && isStaff && (
                    <button
                      onClick={async () => {
                        if (
                          await confirm({
                            title: `Delete “${a.title}”?`,
                            body: "This permanently removes the draft. Prefer Archive if you might restore it.",
                            confirmLabel: "Delete draft",
                            danger: true,
                          })
                        )
                          removeDraft.mutate(a.id);
                      }}
                      className="text-ink-soft underline hover:text-red-900"
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
