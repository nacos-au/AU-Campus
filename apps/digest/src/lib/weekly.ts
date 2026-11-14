import type { ArticleWithMeta, WeeklyIssue, WeeklyIssueSlot } from "@/lib/types";

export type WeeklySlotKind = "lead" | "second" | "rail" | "inside";

export type WeeklyIssueWithSlots = WeeklyIssue & {
  weekly_issue_slots: (WeeklyIssueSlot & {
    articles?: ArticleWithMeta | null;
  })[];
};

/** Monday (UTC date string YYYY-MM-DD) for the calendar week containing `d`. */
export function mondayOf(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x.toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekEndSunday(weekStart: string): string {
  return addDaysIso(weekStart, 6);
}

export function formatWeekLabel(
  weekStart: string,
  locale = "en-US"
): string {
  const d = new Date(`${weekStart}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function isLiveIssue(
  issue: Pick<WeeklyIssue, "status" | "scheduled_at">,
  now = new Date()
): boolean {
  if (issue.status === "published") return true;
  if (issue.status === "scheduled" && issue.scheduled_at) {
    return new Date(issue.scheduled_at).getTime() <= now.getTime();
  }
  return false;
}

export function slotsByKind(issue: WeeklyIssueWithSlots) {
  const slots = issue.weekly_issue_slots ?? [];
  const sorted = [...slots].sort((a, b) => a.position - b.position);
  const articleOf = (s: (typeof slots)[number] | undefined) =>
    (s?.articles as ArticleWithMeta | null | undefined) ?? null;

  const lead = articleOf(sorted.find((s) => s.slot === "lead"));
  const second = articleOf(sorted.find((s) => s.slot === "second"));
  const rail = sorted
    .filter((s) => s.slot === "rail")
    .map(articleOf)
    .filter((a): a is ArticleWithMeta => !!a);
  const inside = sorted
    .filter((s) => s.slot === "inside")
    .map((s) => ({
      sectionId: s.section_id,
      article: articleOf(s),
      position: s.position,
    }))
    .filter(
      (x): x is {
        sectionId: number | null;
        article: ArticleWithMeta;
        position: number;
      } => !!x.article
    );

  return { lead, second, rail, inside };
}

export function usedArticleIds(issue: WeeklyIssueWithSlots): Set<string> {
  const ids = new Set<string>();
  for (const s of issue.weekly_issue_slots ?? []) {
    if (s.article_id) ids.add(s.article_id);
  }
  return ids;
}
