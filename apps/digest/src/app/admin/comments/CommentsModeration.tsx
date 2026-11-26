"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Empty, PageHeader, Pill, btn, input, label } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { RemoveDialog, SuspendDialog } from "@/components/comments/CommentDialogs";
import { articlePublicPath } from "@/lib/articles";
import {
  FILTER_CATEGORIES,
  commentAnchor,
  reportReasonLabel,
  type CommentStatus,
} from "@/lib/comments";
import { createClient } from "@/lib/supabase/client";

type Tab = "review" | "removed" | "suspensions" | "filters";

interface Person {
  display_name: string;
  username?: string | null;
}

interface CommentRow {
  id: string;
  body: string;
  status: CommentStatus;
  report_count: number;
  reviewed: boolean;
  created_at: string;
  author_id: string | null;
  removed_reason: string | null;
  moderated_at: string | null;
  author: Person | null;
  moderator: Person | null;
  article: { title: string; slug: string; short_code: string | null } | null;
}

interface ReportRow {
  comment_id: string;
  reason: string;
  note: string | null;
  created_at: string;
  reporter_id: string;
  reporter: Person | null;
}

interface SuspensionRow {
  id: string;
  until_at: string | null;
  reason: string;
  created_at: string;
  user: Person | null;
  by: Person | null;
}

interface FilterRow {
  id: number;
  term: string;
  category: string;
}

const COMMENT_SELECT =
  "id, body, status, report_count, reviewed, created_at, author_id, removed_reason, moderated_at, author:profiles!author_id(display_name, username), moderator:profiles!moderated_by(display_name), article:articles!article_id(title, slug, short_code)";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );

function setupHint(message: string) {
  return /does not exist|schema cache|PGRST20|42P01|42883/i.test(message)
    ? "Comments are not set up in the database yet. Run supabase/digest_article_comments_APPLY_ALL.sql in the SQL editor."
    : message;
}

function storyLink(c: CommentRow) {
  if (!c.article) return null;
  return `${articlePublicPath(c.article)}#${commentAnchor(c.id)}`;
}

export function CommentsModeration({ isAdmin }: { isAdmin: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { confirm } = useConfirm();

  const [tab, setTab] = useState<Tab>("review");
  const [error, setError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [suspend, setSuspend] = useState<{
    userId: string;
    name: string;
    commentId: string;
  } | null>(null);
  const [showExport, setShowExport] = useState(false);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-comments"] });
  };

  // ── Needs review ─────────────────────────────────────────────────────────
  const queue = useQuery({
    queryKey: ["admin-comments", "queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_comments")
        .select(COMMENT_SELECT)
        .is("deleted_at", null)
        .or("status.in.(held,collapsed),and(status.eq.visible,report_count.gt.0)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as unknown as CommentRow[];
      const ids = rows.map((r) => r.id);

      let reports: ReportRow[] = [];
      const dismissed = new Map<string, number>();
      if (ids.length > 0) {
        const { data: rep, error: repErr } = await supabase
          .from("comment_reports")
          .select(
            "comment_id, reason, note, created_at, reporter_id, reporter:profiles!reporter_id(display_name)"
          )
          .in("comment_id", ids)
          .is("resolved_at", null)
          .order("created_at");
        if (repErr) throw repErr;
        reports = (rep ?? []) as unknown as ReportRow[];

        const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
        if (reporterIds.length > 0) {
          const { data: past } = await supabase
            .from("comment_reports")
            .select("reporter_id")
            .eq("resolution", "dismissed")
            .in("reporter_id", reporterIds);
          for (const p of (past ?? []) as { reporter_id: string }[]) {
            dismissed.set(p.reporter_id, (dismissed.get(p.reporter_id) ?? 0) + 1);
          }
        }
      }
      return { rows, reports, dismissed };
    },
  });

  // ── Removed ──────────────────────────────────────────────────────────────
  const removed = useQuery({
    queryKey: ["admin-comments", "removed"],
    enabled: tab === "removed",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_comments")
        .select(COMMENT_SELECT)
        .eq("status", "removed")
        .order("moderated_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  // ── Suspensions ──────────────────────────────────────────────────────────
  const suspensions = useQuery({
    queryKey: ["admin-comments", "suspensions"],
    enabled: tab === "suspensions",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_suspensions")
        .select(
          "id, until_at, reason, created_at, user:profiles!user_id(display_name, username), by:profiles!created_by(display_name)"
        )
        .is("lifted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const now = Date.now();
      return ((data ?? []) as unknown as SuspensionRow[]).filter(
        (s) => !s.until_at || new Date(s.until_at).getTime() > now
      );
    },
  });

  // ── Filter terms ─────────────────────────────────────────────────────────
  const filters = useQuery({
    queryKey: ["admin-comments", "filters"],
    enabled: tab === "filters",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_filters")
        .select("id, term, category")
        .order("category")
        .order("term");
      if (error) throw error;
      return (data ?? []) as FilterRow[];
    },
  });

  const act = useMutation({
    mutationFn: async (vars: {
      id: string;
      action: "keep" | "collapse" | "restore" | "approve";
    }) => {
      const { error } = await supabase.rpc("moderate_comment", {
        p_comment_id: vars.id,
        p_action: vars.action,
      });
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const lift = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("lift_comment_suspension", {
        p_suspension_id: id,
      });
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string>("other");
  const addFilter = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("add_comment_filter", {
        p_term: term,
        p_category: category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTerm("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const removeFilter = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.rpc("remove_comment_filter", {
        p_filter_id: id,
      });
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });

  const queueCount = queue.data?.rows.length ?? null;
  const tabs: { id: Tab; label: string }[] = [
    {
      id: "review",
      label: queueCount === null ? "Needs review" : `Needs review (${queueCount})`,
    },
    { id: "removed", label: "Removed" },
    { id: "suspensions", label: "Suspensions" },
    { id: "filters", label: "Filter terms" },
  ];

  const loadError =
    (tab === "review" && queue.error) ||
    (tab === "removed" && removed.error) ||
    (tab === "suspensions" && suspensions.error) ||
    (tab === "filters" && filters.error) ||
    null;

  return (
    <div>
      <PageHeader
        title="Comments"
        description="Held, reported and collapsed comments, plus suspensions and the language filter. Nothing is deleted: every action is logged."
        action={
          isAdmin ? (
            <button
              type="button"
              onClick={() => setShowExport((v) => !v)}
              className={btn.secondary}
            >
              Export log
            </button>
          ) : undefined
        }
      />

      {isAdmin && showExport && <ExportPanel />}

      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-rule px-4 pb-3 text-xs font-semibold [scrollbar-width:none] sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 transition-colors ${
              tab === t.id
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-gray-100 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
      {loadError && (
        <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {setupHint((loadError as Error).message)}
        </p>
      )}

      {/* Needs review */}
      {tab === "review" && !queue.error && (
        <div className="divide-y divide-rule">
          {queue.isLoading ? (
            <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
          ) : (queue.data?.rows.length ?? 0) === 0 ? (
            <Empty
              title="All clear"
              body="No held, reported or collapsed comments right now."
            />
          ) : (
            queue.data!.rows.map((c) => {
              const reports = queue.data!.reports.filter(
                (r) => r.comment_id === c.id
              );
              const href = storyLink(c);
              return (
                <div key={c.id} className="py-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    {c.status === "held" && <Pill tone="warn">Held by filter</Pill>}
                    {c.status === "collapsed" && <Pill tone="neutral">Collapsed</Pill>}
                    {c.report_count > 0 && (
                      <Pill tone="danger">
                        {c.report_count} open report{c.report_count === 1 ? "" : "s"}
                      </Pill>
                    )}
                    {c.reviewed && <Pill tone="ok">Reviewed before</Pill>}
                    <span className="font-semibold text-ink">
                      {c.author?.display_name ?? "Former member"}
                    </span>
                    <span>{when(c.created_at)}</span>
                    {href && c.article && (
                      <Link
                        href={href}
                        className="underline underline-offset-2 hover:text-ink"
                      >
                        {c.article.title}
                      </Link>
                    )}
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {c.body}
                  </p>

                  {reports.length > 0 && (
                    <ul className="mt-3 space-y-1 border-l-2 border-rule pl-3 text-xs text-ink-soft">
                      {reports.map((r) => {
                        const past = queue.data!.dismissed.get(r.reporter_id) ?? 0;
                        return (
                          <li key={`${r.comment_id}-${r.reporter_id}`}>
                            <span className="font-semibold text-ink">
                              {r.reporter?.display_name ?? "Member"}
                            </span>{" "}
                            · {reportReasonLabel(r.reason)}
                            {r.note ? ` · “${r.note}”` : ""}
                            {past > 0 && (
                              <span className="text-amber-700">
                                {" "}
                                · {past} earlier report{past === 1 ? "" : "s"} dismissed
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {c.status === "held" ? (
                      <button
                        type="button"
                        onClick={() => act.mutate({ id: c.id, action: "approve" })}
                        className={btn.primary}
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => act.mutate({ id: c.id, action: "keep" })}
                        className={btn.primary}
                      >
                        Keep
                      </button>
                    )}
                    {c.status === "visible" && (
                      <button
                        type="button"
                        onClick={() => act.mutate({ id: c.id, action: "collapse" })}
                        className={btn.secondary}
                      >
                        Collapse
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRemoveId(c.id)}
                      className={btn.danger}
                    >
                      Remove…
                    </button>
                    {c.author_id && (
                      <button
                        type="button"
                        onClick={() =>
                          setSuspend({
                            userId: c.author_id!,
                            name: c.author?.display_name ?? "this member",
                            commentId: c.id,
                          })
                        }
                        className={btn.danger}
                      >
                        Suspend commenter…
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Removed */}
      {tab === "removed" && !removed.error && (
        <div className="divide-y divide-rule">
          {removed.isLoading ? (
            <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
          ) : (removed.data?.length ?? 0) === 0 ? (
            <Empty title="Nothing removed" body="Removed comments appear here so they can be restored." />
          ) : (
            removed.data!.map((c) => (
              <div key={c.id} className="py-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <Pill tone="danger">Removed</Pill>
                  <span className="font-semibold text-ink">
                    {c.author?.display_name ?? "Former member"}
                  </span>
                  {c.moderated_at && (
                    <span>
                      {when(c.moderated_at)}
                      {c.moderator ? ` by ${c.moderator.display_name}` : ""}
                    </span>
                  )}
                  {c.article && <span>{c.article.title}</span>}
                </div>
                {c.removed_reason && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Reason: {c.removed_reason}
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                  {c.body}
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => act.mutate({ id: c.id, action: "restore" })}
                    className={btn.secondary}
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Suspensions */}
      {tab === "suspensions" && !suspensions.error && (
        <div className="divide-y divide-rule">
          {suspensions.isLoading ? (
            <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
          ) : (suspensions.data?.length ?? 0) === 0 ? (
            <Empty
              title="No active suspensions"
              body="Suspend a commenter from a comment in the queue or on the story."
            />
          ) : (
            suspensions.data!.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {s.user?.display_name ?? "Former member"}{" "}
                    <Pill tone={s.until_at ? "warn" : "danger"}>
                      {s.until_at ? `Until ${when(s.until_at)}` : "Indefinite"}
                    </Pill>
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {s.reason} · {when(s.created_at)}
                    {s.by ? ` · by ${s.by.display_name}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => lift.mutate(s.id)}
                  className={btn.secondary}
                >
                  Lift
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Filter terms */}
      {tab === "filters" && !filters.error && (
        <div className="mt-6 space-y-6">
          <Card title="Add a term">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (term.trim()) addFilter.mutate();
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <label className={`${label} min-w-[14rem] flex-1`}>
                Word or phrase
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  maxLength={60}
                  className={input}
                />
              </label>
              <label className={label}>
                Type
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={input}
                >
                  {FILTER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={!term.trim() || addFilter.isPending}
                className={btn.primary}
              >
                Add
              </button>
            </form>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              Whole words or phrases only, so innocent words that merely
              contain a term are not caught. Common look-alike swaps (0 for o,
              1 for i, 3 for e, 4 for a, 5 for s, @ for a, $ for s) are
              treated as the letter. A match holds the comment for editor
              review; it is never rejected or deleted automatically.
            </p>
          </Card>

          {filters.isLoading ? (
            <p className="py-8 text-center text-sm text-ink-soft">Loading…</p>
          ) : (
            FILTER_CATEGORIES.map((cat) => {
              const rows = (filters.data ?? []).filter((f) => f.category === cat);
              if (rows.length === 0) return null;
              return (
                <Card key={cat} title={`${cat} (${rows.length})`}>
                  <ul className="flex flex-wrap gap-2">
                    {rows.map((f) => (
                      <li
                        key={f.id}
                        className="inline-flex items-center gap-1.5 border border-rule-dark px-2.5 py-1 text-sm"
                      >
                        {f.term}
                        <button
                          type="button"
                          aria-label={`Remove ${f.term}`}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `Remove “${f.term}”?`,
                                body: "Comments will no longer be held for this term. The removal is logged.",
                                confirmLabel: "Remove term",
                                danger: true,
                              })
                            )
                              removeFilter.mutate(f.id);
                          }}
                          className="text-ink-soft hover:text-red-700"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })
          )}
        </div>
      )}

      {removeId && (
        <RemoveDialog
          commentId={removeId}
          onClose={() => setRemoveId(null)}
          onDone={() => {
            setRemoveId(null);
            refresh();
          }}
        />
      )}
      {suspend && (
        <SuspendDialog
          userId={suspend.userId}
          userName={suspend.name}
          commentId={suspend.commentId}
          onClose={() => setSuspend(null)}
          onDone={() => {
            setSuspend(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ExportPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (action) params.set("action", action);
  const href = `/admin/comments/export${params.size ? `?${params}` : ""}`;

  return (
    <Card title="Export moderation log (CSV)" className="mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className={label}>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          Action
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className={input}
          >
            <option value="">All</option>
            {[
              "remove",
              "restore",
              "keep",
              "collapse",
              "auto_collapse",
              "approve",
              "filter_hold",
              "suspend",
              "lift_suspension",
              "lock_comments",
              "unlock_comments",
              "filter_add",
              "filter_remove",
            ].map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <a href={href} download className={btn.primary}>
          Download CSV
        </a>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        Every collapse, removal, restore, suspension, filter hold and lock, with
        who did it, when, the reason, and the comment text at the time.
      </p>
    </Card>
  );
}
