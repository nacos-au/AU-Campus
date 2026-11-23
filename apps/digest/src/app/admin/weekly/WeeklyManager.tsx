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
  "*, weekly_issue_slots(id, slot, position, article_id, section_id, teaser, articles:article_id(id, title, slug, section_id, status))";

type SlotDraft = {
  slot: WeeklySlotKind;
  position: number;
  articleId: string;
  sectionId: number | null;
  teaser: string;
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
  const [intro, setIntro] = useState("");
  const [introByline, setIntroByline] = useState("");
  const [leadId, setLeadId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [railIds, setRailIds] = useState(["", "", "", ""]);
  const [leadTeaser, setLeadTeaser] = useState("");
  const [secondTeaser, setSecondTeaser] = useState("");
  const [railTeasers, setRailTeasers] = useState(["", "", "", ""]);
  const [insideBySection, setInsideBySection] = useState<
    Record<number, string[]>
  >({});
  const [insideTeasers, setInsideTeasers] = useState<
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
    setInsideTeasers((prev) => {
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
    setIntro("");
    setIntroByline("");
    setLeadId("");
    setSecondId("");
    setRailIds(["", "", "", ""]);
    setLeadTeaser("");
    setSecondTeaser("");
    setRailTeasers(["", "", "", ""]);
    const inside: Record<number, string[]> = {};
    const teasers: Record<number, string[]> = {};
    for (const s of sections) {
      inside[s.id] = ["", "", "", ""];
      teasers[s.id] = ["", "", "", ""];
    }
    setInsideBySection(inside);
    setInsideTeasers(teasers);
    setError(null);
  }

  function loadIssue(issue: WeeklyIssueWithSlots) {
    setEditingId(issue.id);
    setTitle(issue.title);
    setWeekStart(issue.week_start);
    setIntro(issue.intro ?? "");
    setIntroByline(issue.intro_byline ?? "");
    setScheduledAt(
      issue.scheduled_at
        ? new Date(issue.scheduled_at).toISOString().slice(0, 16)
        : ""
    );
    const slots = [...(issue.weekly_issue_slots ?? [])].sort(
      (a, b) => a.position - b.position
    );
    const leadSlot = slots.find((s) => s.slot === "lead");
    const secondSlot = slots.find((s) => s.slot === "second");
    setLeadId(leadSlot?.article_id ?? "");
    setLeadTeaser(leadSlot?.teaser ?? "");
    setSecondId(secondSlot?.article_id ?? "");
    setSecondTeaser(secondSlot?.teaser ?? "");
    const rails = slots.filter((s) => s.slot === "rail");
    setRailIds([0, 1, 2, 3].map((i) => rails[i]?.article_id ?? ""));
    setRailTeasers([0, 1, 2, 3].map((i) => rails[i]?.teaser ?? ""));
    const inside: Record<number, string[]> = {};
    const teasers: Record<number, string[]> = {};
    for (const s of sections) {
      const desk = slots.filter(
        (x) => x.slot === "inside" && x.section_id === s.id
      );
      inside[s.id] = [0, 1, 2, 3].map((i) => desk[i]?.article_id ?? "");
      teasers[s.id] = [0, 1, 2, 3].map((i) => desk[i]?.teaser ?? "");
    }
    setInsideBySection(inside);
    setInsideTeasers(teasers);
    setError(null);
  }

  function buildSlots(): SlotDraft[] {
    const out: SlotDraft[] = [];
    if (leadId)
      out.push({
        slot: "lead",
        position: 0,
        articleId: leadId,
        sectionId: null,
        teaser: leadTeaser.trim(),
      });
    if (secondId)
      out.push({
        slot: "second",
        position: 0,
        articleId: secondId,
        sectionId: null,
        teaser: secondTeaser.trim(),
      });
    railIds.forEach((id, i) => {
      if (id)
        out.push({
          slot: "rail",
          position: i,
          articleId: id,
          sectionId: null,
          teaser: (railTeasers[i] ?? "").trim(),
        });
    });
    for (const s of sections) {
      (insideBySection[s.id] ?? []).forEach((id, i) => {
        if (id)
          out.push({
            slot: "inside",
            position: i,
            articleId: id,
            sectionId: s.id,
            teaser: (insideTeasers[s.id]?.[i] ?? "").trim(),
          });
      });
    }
    return out;
  }

  async function upsertIssue(status: WeeklyIssueStatus) {
    if (!title.trim()) throw new Error("Title is required.");
    if (!weekStart) throw new Error("Week start is required.");
    const slots = buildSlots();
    if (status !== "draft" && !slots.some((s) => s.slot === "lead") && !intro.trim()) {
      throw new Error("Add a lead story or a week intro before scheduling/publishing.");
    }

    const payload = {
      title: title.trim(),
      week_start: weekStart,
      status,
      intro: intro.trim() || null,
      intro_byline: introByline.trim() || null,
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
      teaser: s.teaser || null,
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
            <h2 className="font-serif text-xl font-bold">From the desk</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Optional week letter — the issue’s own voice, not an article dek.
            </p>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Intro byline
                </span>
                <input
                  value={introByline}
                  onChange={(e) => setIntroByline(e.target.value)}
                  placeholder="From the Desk"
                  className="mt-1 w-full border border-rule px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Week intro
                </span>
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  rows={5}
                  className="mt-1 w-full border border-rule px-3 py-2 text-sm"
                  placeholder="What this week’s paper is about…"
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold">Front page frame</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Lead · Second · Rail (up to 4). Optional teaser overrides the article dek on /weekly.
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
                <input
                  value={leadTeaser}
                  onChange={(e) => setLeadTeaser(e.target.value)}
                  placeholder="Optional teaser for lead"
                  className="mt-2 w-full border border-rule px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Second
                </span>
                <ArticleSelect
                  value={secondId}
                  onChange={setSecondId}
                  exclude={picked}
                />
                <input
                  value={secondTeaser}
                  onChange={(e) => setSecondTeaser(e.target.value)}
                  placeholder="Optional teaser for second"
                  className="mt-2 w-full border border-rule px-3 py-2 text-sm"
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
                  <input
                    value={railTeasers[i] ?? ""}
                    onChange={(e) => {
                      const next = [...railTeasers];
                      next[i] = e.target.value;
                      setRailTeasers(next);
                    }}
                    placeholder="Optional teaser"
                    className="mt-2 w-full border border-rule px-3 py-2 text-sm"
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
                        <input
                          value={insideTeasers[s.id]?.[i] ?? ""}
                          onChange={(e) => {
                            const cur = [
                              ...(insideTeasers[s.id] ?? ["", "", "", ""]),
                            ];
                            cur[i] = e.target.value;
                            setInsideTeasers({
                              ...insideTeasers,
                              [s.id]: cur,
                            });
                          }}
                          placeholder="Optional teaser"
                          className="mt-2 w-full border border-rule px-3 py-2 text-sm"
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

        <aside className="space-y-8">
          <div className="border border-rule bg-white p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Layout preview
            </h2>
            <p className="mt-1 text-[11px] text-ink-soft">
              Empty slots collapse. Teasers clamp on the public page.
            </p>
            <div className="mt-3 space-y-2 text-xs">
              {intro.trim() ? (
                <p className="line-clamp-3 border-b border-rule pb-2 font-serif italic text-ink-soft">
                  {intro.trim()}
                </p>
              ) : (
                <p className="text-ink-soft/70">No intro yet</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div className="border border-rule p-2">
                  <p className="font-bold uppercase tracking-wide text-[10px]">Lead</p>
                  <p className="mt-1 line-clamp-2 font-semibold">
                    {articles.find((a) => a.id === leadId)?.title ?? "—"}
                  </p>
                  {leadTeaser.trim() ? (
                    <p className="mt-1 line-clamp-2 text-ink-soft">{leadTeaser}</p>
                  ) : null}
                </div>
                <div className="border border-rule p-2">
                  <p className="font-bold uppercase tracking-wide text-[10px]">Second</p>
                  <p className="mt-1 line-clamp-2 font-semibold">
                    {articles.find((a) => a.id === secondId)?.title ?? "—"}
                  </p>
                </div>
                <div className="border border-rule p-2">
                  <p className="font-bold uppercase tracking-wide text-[10px]">Rail</p>
                  <ul className="mt-1 space-y-1">
                    {railIds.filter(Boolean).map((id) => (
                      <li key={id} className="line-clamp-1">
                        {articles.find((a) => a.id === id)?.title ?? id}
                      </li>
                    ))}
                    {!railIds.some(Boolean) && <li>—</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>

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
