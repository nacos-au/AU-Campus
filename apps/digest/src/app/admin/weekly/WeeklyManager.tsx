"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, btn } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_SECTION_SLUGS } from "@/lib/features";
import {
  formatWeekLabel,
  mondayOf,
  type WeeklyIssueWithSlots,
} from "@/lib/weekly";
import type {
  ArticleWithMeta,
  Section,
  WeeklyIssue,
  WeeklyIssueStatus,
  WeeklySlotKind,
} from "@/lib/types";

const SLOT_SELECT =
  "*, weekly_issue_slots(id, slot, position, article_id, section_id, articles:article_id(id, title, slug, section_id, status))";

type SlotDraft = {
  slot: WeeklySlotKind;
  position: number;
  articleId: string;
  sectionId: number | null;
};

const STATUS_STYLE: Record<WeeklyIssueStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-ink/10 text-ink-soft",
};

export function WeeklyManager() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [weekStart, setWeekStart] = useState(mondayOf());
  const [scheduledAt, setScheduledAt] = useState("");
  const [leadId, setLeadId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [railIds, setRailIds] = useState(["", "", "", ""]);
  const [insideBySection, setInsideBySection] = useState<
    Record<number, string[]>
  >({});

  const issuesQuery = useQuery({
    queryKey: ["admin-weekly-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_issues")
        .select(SLOT_SELECT)
        .order("week_start", { ascending: false });
      if (error) throw error;
      return data as unknown as WeeklyIssueWithSlots[];
    },
  });

  const articlesQuery = useQuery({
    queryKey: ["admin-weekly-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id, title, slug, section_id, status, sections(slug, name), published_at"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as ArticleWithMeta[];
    },
  });

  const sectionsQuery = useQuery({
    queryKey: ["admin-weekly-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return ((data ?? []) as Section[]).filter((s) =>
        (PUBLIC_SECTION_SLUGS as readonly string[]).includes(s.slug)
      );
    },
  });

  const issues = issuesQuery.data ?? [];
  const articles = articlesQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];

  useEffect(() => {
    if (editingId || sections.length === 0) return;
    setInsideBySection((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const s of sections) {
        if (!next[s.id]) {
          next[s.id] = ["", "", "", ""];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (!title) setTitle(`Week of ${formatWeekLabel(weekStart)}`);
  }, [sections, editingId, title, weekStart]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-weekly-issues"] });
  };

  function resetForm(nextWeek = mondayOf()) {
    setEditingId(null);
    setTitle(`Week of ${formatWeekLabel(nextWeek)}`);
    setWeekStart(nextWeek);
    setScheduledAt("");
    setLeadId("");
    setSecondId("");
    setRailIds(["", "", "", ""]);
    const inside: Record<number, string[]> = {};
    for (const s of sections) inside[s.id] = ["", "", "", ""];
    setInsideBySection(inside);
    setError(null);
  }

  function loadIssue(issue: WeeklyIssueWithSlots) {
    setEditingId(issue.id);
    setTitle(issue.title);
    setWeekStart(issue.week_start);
    setScheduledAt(
      issue.scheduled_at
        ? new Date(issue.scheduled_at).toISOString().slice(0, 16)
        : ""
    );
    const slots = [...(issue.weekly_issue_slots ?? [])].sort(
      (a, b) => a.position - b.position
    );
    setLeadId(slots.find((s) => s.slot === "lead")?.article_id ?? "");
    setSecondId(slots.find((s) => s.slot === "second")?.article_id ?? "");
    const rails = slots
      .filter((s) => s.slot === "rail")
      .map((s) => s.article_id);
    setRailIds([0, 1, 2, 3].map((i) => rails[i] ?? ""));
    const inside: Record<number, string[]> = {};
    for (const s of sections) {
      const ids = slots
        .filter((x) => x.slot === "inside" && x.section_id === s.id)
        .map((x) => x.article_id);
      inside[s.id] = [0, 1, 2, 3].map((i) => ids[i] ?? "");
    }
    setInsideBySection(inside);
    setError(null);
  }

  function buildSlots(): SlotDraft[] {
    const out: SlotDraft[] = [];
    if (leadId) out.push({ slot: "lead", position: 0, articleId: leadId, sectionId: null });
    if (secondId)
      out.push({ slot: "second", position: 0, articleId: secondId, sectionId: null });
    railIds.forEach((id, i) => {
      if (id) out.push({ slot: "rail", position: i, articleId: id, sectionId: null });
    });
    for (const s of sections) {
      (insideBySection[s.id] ?? []).forEach((id, i) => {
        if (id)
          out.push({
            slot: "inside",
            position: i,
            articleId: id,
            sectionId: s.id,
          });
      });
    }
    return out;
  }

  async function upsertIssue(status: WeeklyIssueStatus) {
    if (!title.trim()) throw new Error("Title is required.");
    if (!weekStart) throw new Error("Week start is required.");
    const slots = buildSlots();
    if (!slots.some((s) => s.slot === "lead")) {
      throw new Error("Pick a lead story for the front page.");
    }

    const payload = {
      title: title.trim(),
      week_start: weekStart,
      status,
      scheduled_at:
        status === "scheduled" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
      published_at:
        status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let issueId = editingId;
    if (issueId) {
      const { error } = await supabase
        .from("weekly_issues")
        .update(payload)
        .eq("id", issueId);
      if (error) throw error;
      await supabase.from("weekly_issue_slots").delete().eq("issue_id", issueId);
    } else {
      const { data, error } = await supabase
        .from("weekly_issues")
        .insert(payload)
        .select()
        .single<WeeklyIssue>();
      if (error) throw error;
      issueId = data.id;
      setEditingId(issueId);
    }

    const rows = slots.map((s) => ({
      issue_id: issueId!,
      slot: s.slot,
      position: s.position,
      article_id: s.articleId,
      section_id: s.sectionId,
    }));
    if (rows.length) {
      const { error } = await supabase.from("weekly_issue_slots").insert(rows);
      if (error) throw error;
    }
  }

  const save = useMutation({
    mutationFn: (status: WeeklyIssueStatus) => upsertIssue(status),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { id: string; status: WeeklyIssueStatus }) => {
      const patch: Record<string, unknown> = {
        status: vars.status,
        updated_at: new Date().toISOString(),
      };
      if (vars.status === "published") patch.published_at = new Date().toISOString();
      if (vars.status === "archived" || vars.status === "draft") {
        patch.scheduled_at = null;
      }
      const { error } = await supabase
        .from("weekly_issues")
        .update(patch)
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  function ArticleSelect({
    value,
    onChange,
    exclude,
  }: {
    value: string;
    onChange: (v: string) => void;
    exclude?: string[];
  }) {
    const blocked = new Set((exclude ?? []).filter((id) => id && id !== value));
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-rule bg-white px-3 py-2 text-sm"
      >
        <option value="">— None —</option>
        {articles
          .filter((a) => !blocked.has(a.id))
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
              {a.sections?.name ? ` · ${a.sections.name}` : ""}
            </option>
          ))}
      </select>
    );
  }

  const picked = [leadId, secondId, ...railIds].filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Weekly Issue"
        description="Build each week inside the fixed front-page frame, then schedule or publish. Readers browse past weeks from a date dropdown."
        action={
          <button type="button" className={btn.secondary} onClick={() => resetForm()}>
            New week
          </button>
        }
      />

      {error && (
        <p className="mb-4 border border-accent/30 bg-white px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6 border border-rule bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-rule px-3 py-2 text-sm"
                placeholder="Week of Nov 10, 2026"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Week start (Monday)
              </span>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="mt-1 w-full border border-rule px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Schedule go-live (optional)
              </span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 w-full border border-rule px-3 py-2 text-sm"
              />
            </label>
          </div>

          <section>
            <h2 className="font-serif text-xl font-bold">Front page frame</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Lead · Second · Rail (up to 4). Same layout readers see on /weekly.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Lead
                </span>
                <ArticleSelect
                  value={leadId}
                  onChange={setLeadId}
                  exclude={picked}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Second
                </span>
                <ArticleSelect
                  value={secondId}
                  onChange={setSecondId}
                  exclude={picked}
                />
              </label>
              {railIds.map((id, i) => (
                <label key={i} className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Rail {i + 1}
                  </span>
                  <ArticleSelect
                    value={id}
                    onChange={(v) => {
                      const next = [...railIds];
                      next[i] = v;
                      setRailIds(next);
                    }}
                    exclude={picked}
                  />
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold">Inside pages</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Up to four stories per desk (News, Campus Life, Sports).
            </p>
            <div className="mt-4 space-y-5">
              {sections.map((s) => (
                <div key={s.id} className="border-t border-rule pt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {s.name}
                  </h3>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {(insideBySection[s.id] ?? ["", "", "", ""]).map((id, i) => (
                      <label key={i} className="block">
                        <span className="text-[11px] font-semibold text-ink-soft">
                          Story {i + 1}
                        </span>
                        <ArticleSelect
                          value={id}
                          onChange={(v) => {
                            const cur = [
                              ...(insideBySection[s.id] ?? ["", "", "", ""]),
                            ];
                            cur[i] = v;
                            setInsideBySection({
                              ...insideBySection,
                              [s.id]: cur,
                            });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-rule pt-4">
            <button
              type="button"
              disabled={save.isPending}
              className={btn.secondary}
              onClick={() => save.mutate("draft")}
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={save.isPending || !scheduledAt}
              className={btn.secondary}
              onClick={() => save.mutate("scheduled")}
            >
              Schedule
            </button>
            <button
              type="button"
              disabled={save.isPending}
              className={btn.primary}
              onClick={() => save.mutate("published")}
            >
              Publish now
            </button>
            {editingId && (
              <Link
                href={`/weekly?week=${weekStart}`}
                className="px-3 py-2 text-sm font-semibold underline"
              >
                Preview
              </Link>
            )}
          </div>
        </div>

        <aside>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            All issues
          </h2>
          {issuesQuery.isLoading ? (
            <p className="mt-3 text-sm text-ink-soft">Loading…</p>
          ) : issues.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">No weekly issues yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule border border-rule">
              {issues.map((issue) => (
                <li key={issue.id} className="bg-white p-3">
                  <button
                    type="button"
                    onClick={() => loadIssue(issue)}
                    className="w-full text-left"
                  >
                    <p className="font-semibold leading-snug">{issue.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatWeekLabel(issue.week_start)}
                    </p>
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[issue.status]}`}
                    >
                      {issue.status}
                    </span>
                    {issue.status !== "archived" && (
                      <button
                        type="button"
                        className="text-xs text-red-700 underline"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: `Archive “${issue.title}”?`,
                              body: "It leaves the public week dropdown but stays editable here.",
                              confirmLabel: "Archive",
                              danger: true,
                            })
                          )
                            setStatus.mutate({
                              id: issue.id,
                              status: "archived",
                            });
                        }}
                      >
                        Archive
                      </button>
                    )}
                    {issue.status === "archived" && (
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() =>
                          setStatus.mutate({ id: issue.id, status: "draft" })
                        }
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
