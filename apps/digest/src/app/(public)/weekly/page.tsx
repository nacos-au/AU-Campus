import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WeekPicker } from "@/components/WeekPicker";
import { WordOfTheDay } from "@/components/WordOfTheDay";
import { WeeklyPage } from "@/components/weekly/WeeklyPage";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import { todaysWord } from "@/lib/campus-lore";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { fetchCampusWeather } from "@/lib/weather";
import {
  articleIdsInLayout,
  ensureLayout,
  usesWeather,
} from "@/lib/weekly-layout";
import {
  effectivePublishDate,
  formatShortDate,
  isLiveIssue,
  issueMeta,
  issueNumberFor,
} from "@/lib/weekly";
import type { ArticleWithMeta, CampusWord, WeeklyIssue } from "@/lib/types";

export const metadata: Metadata = { title: "Weekly Issue" };
export const revalidate = 60;

const ISSUE_SELECT = `*, weekly_issue_slots(id, slot, position, article_id, section_id, teaser)`;

export default async function WeeklyIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const [{ week: weekParam }, supabase, locale, t, { profile }] =
    await Promise.all([
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
      .select("id, week_start, publish_date, title, status, scheduled_at, published_at")
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
  const pickerSource = isStaff ? allIssues : liveIssues;

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
    if (issue && !isLiveIssue(issue) && !isStaff) issue = null;
  }

  const weekOptions = pickerSource.map((i) => {
    const date = effectivePublishDate(i);
    return {
      weekStart: i.week_start,
      label: `No. ${issueNumberFor(date, allIssues, i.id)} · ${formatShortDate(date, locale)}`,
    };
  });

  const picker =
    weekOptions.length > 0 && activeWeek ? (
      <div className="-mt-2 mb-2 flex justify-end">
        <WeekPicker
          label={t("theDigestFor")}
          options={weekOptions}
          value={activeWeek}
        />
      </div>
    ) : null;

  if (!issue) {
    return (
      <div className="py-6 md:py-10">
        {picker}
        <p className="py-20 text-center text-ink-soft">{t("weeklyEmpty")}</p>
      </div>
    );
  }

  const { layout } = ensureLayout({
    layout: issue.layout,
    intro: issue.intro,
    introByline: issue.intro_byline,
    slots: ((issue as WeeklyIssue & { weekly_issue_slots?: unknown[] })
      .weekly_issue_slots ?? []) as Parameters<typeof ensureLayout>[0]["slots"],
  });

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

  const weather = usesWeather(layout.nameplate)
    ? await fetchCampusWeather()
    : null;
  const meta = issueMeta(
    effectivePublishDate(issue),
    allIssues,
    issue.id,
    locale
  );
  const isDraftView = !isLiveIssue(issue);

  return (
    <div className="py-4 md:py-6">
      {picker}
      {isDraftView ? (
        <p className="mb-3 border border-dashed border-accent/40 bg-accent-soft px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-accent">
          Draft · only editors can see this issue
        </p>
      ) : null}

      <WeeklyPage
        layout={layout}
        articlesById={articlesById}
        meta={meta}
        weather={weather}
      />

      {word ? (
        <div className="mt-2 max-w-sm border-t border-rule pt-8">
          <WordOfTheDay
            word={word}
            label={t("wordOfTheDay")}
            revealLabel={t("tapForMeaning")}
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
