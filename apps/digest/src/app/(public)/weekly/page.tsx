import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WeekPicker } from "@/components/WeekPicker";
import { WordOfTheDay } from "@/components/WordOfTheDay";
import { WeeklyBlockView } from "@/components/weekly/WeeklyBlockView";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import { todaysWord } from "@/lib/campus-lore";
import { getSessionProfile, hasRole } from "@/lib/auth";
import {
  articleIdsInLayout,
  ensureLayout,
  parseLayout,
} from "@/lib/weekly-layout";
import {
  formatWeekLabel,
  isLiveIssue,
} from "@/lib/weekly";
import type {
  ArticleWithMeta,
  CampusWord,
  WeeklyIssue,
} from "@/lib/types";

export const metadata: Metadata = { title: "Weekly Issue" };
export const revalidate = 60;

const ISSUE_SELECT = `*, weekly_issue_slots(id, slot, position, article_id, section_id, teaser)`;

export default async function WeeklyIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const [{ week: weekParam }, supabase, locale, t, { profile }] = await Promise.all([
    searchParams,
    createClient(),
    getLocale(),
    getTranslations("home"),
    getSessionProfile(),
  ]);
  const isStaff = hasRole(profile, "editor");

  const [{ data: allIssuesData }, { data: wordsData }] = await Promise.all([
    supabase
      .from("weekly_issues")
      .select("id, week_start, title, status, scheduled_at, published_at")
      .neq("status", "archived")
      .order("week_start", { ascending: false }),
    supabase
      .from("campus_words")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("created_at"),
  ]);

  const word = todaysWord((wordsData ?? []) as CampusWord[]);
  const allIssues = (allIssuesData ?? []) as WeeklyIssue[];
  const liveIssues = allIssues.filter((i) => isLiveIssue(i));
  const pickerSource = isStaff
    ? allIssues.filter((i) => i.status !== "archived")
    : liveIssues;

  const requested = weekParam?.match(/^\d{4}-\d{2}-\d{2}$/) ? weekParam : null;
  const defaultWeek =
    liveIssues[0]?.week_start ?? pickerSource[0]?.week_start ?? null;
  const activeWeek = requested ?? defaultWeek;

  let issue: WeeklyIssue | null = null;
  if (activeWeek) {
    const { data } = await supabase
      .from("weekly_issues")
      .select(ISSUE_SELECT)
      .eq("week_start", activeWeek)
      .maybeSingle();
    issue = (data as WeeklyIssue | null) ?? null;
    if (issue && !isLiveIssue(issue) && !isStaff) {
      issue = null;
    }
  }

  const layout = issue
    ? ensureLayout({
        layout: issue.layout,
        intro: issue.intro,
        introByline: issue.intro_byline,
        slots: (
          (issue as WeeklyIssue & { weekly_issue_slots?: unknown[] })
            .weekly_issue_slots ?? []
        ) as Parameters<typeof ensureLayout>[0]["slots"],
      }).layout
    : parseLayout(null);

  const ids = articleIdsInLayout(layout);
  let articlesById = new Map<string, ArticleWithMeta>();
  if (ids.length) {
    const { data } = await supabase
      .from("articles")
      .select(ARTICLE_PUBLIC_SELECT)
      .in("id", ids)
      .eq("status", "published");
    articlesById = new Map(
      ((data ?? []) as unknown as ArticleWithMeta[]).map((a) => [a.id, a])
    );
  }

  const weekOptions = pickerSource.map((i) => ({
    weekStart: i.week_start,
    label: formatWeekLabel(i.week_start, locale),
  }));

  const hasBlocks = layout.blocks.length > 0;
  const hasIntro = layout.blocks.some((b) => b.type === "intro");

  return (
    <div className="py-6 md:py-10">
      <header className="border-b-2 border-ink pb-5">
        <h1 className="font-serif text-4xl font-black tracking-tight md:text-6xl">
          {t("thisWeeksIssue")}
        </h1>
        {weekOptions.length > 0 && activeWeek ? (
          <WeekPicker
            label={t("theDigestFor")}
            options={weekOptions}
            value={activeWeek}
          />
        ) : (
          <p className="mt-3 text-sm text-ink-soft">{t("weeklyEmpty")}</p>
        )}
        {issue?.title ? (
          <p className="mt-2 font-serif text-lg text-ink-soft">{issue.title}</p>
        ) : null}
      </header>

      {!hasBlocks ? (
        <p className="py-20 text-center text-ink-soft">{t("weeklyEmpty")}</p>
      ) : (
        <>
          {word && !hasIntro ? (
            <div className="mt-8 max-w-sm">
              <WordOfTheDay
                word={word}
                label={t("wordOfTheDay")}
                revealLabel={t("tapForMeaning")}
              />
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-8">
            {layout.blocks.map((block) => (
              <WeeklyBlockView
                key={block.id}
                block={block}
                articlesById={articlesById}
              />
            ))}
          </div>

          {word && hasIntro ? (
            <div className="mt-10 max-w-sm border-t border-rule pt-8">
              <WordOfTheDay
                word={word}
                label={t("wordOfTheDay")}
                revealLabel={t("tapForMeaning")}
                compact
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
