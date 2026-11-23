import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Byline, CompactStory } from "@/components/stories";
import { WeekPicker } from "@/components/WeekPicker";
import { ARTICLE_PUBLIC_SELECT, excerpt } from "@/lib/articles";
import { isPublicSectionSlug } from "@/lib/features";
import { getSessionProfile, hasRole } from "@/lib/auth";
import {
  formatWeekLabel,
  isLiveIssue,
  slotsByKind,
  usedArticleIds,
  type WeeklyIssueWithSlots,
} from "@/lib/weekly";
import type { ArticleWithMeta, Section, WeeklyIssue } from "@/lib/types";

export const metadata: Metadata = { title: "Weekly Issue" };
export const revalidate = 60;

const ARTICLE_EMBED =
  "id, slug, title, dek, body, cover_url, section_id, author_id, status, featured, breaking, published_at, byline, byline_mode, sections(slug, name), profiles!articles_author_id_fkey(display_name, username), article_series(id, slug, title)";

const ISSUE_SELECT = `*, weekly_issue_slots(id, slot, position, article_id, section_id, articles:article_id(${ARTICLE_EMBED}))`;

function dek(a: ArticleWithMeta, chars = 180) {
  return a.dek || excerpt(a.body, chars);
}

function Thumb({ a, className = "" }: { a: ArticleWithMeta; className?: string }) {
  if (!a.cover_url) return null;
  return (
    <div className={`relative shrink-0 overflow-hidden bg-rule ${className}`}>
      <Image src={a.cover_url} alt="" fill sizes="200px" className="object-cover" />
    </div>
  );
}

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

  const { data: allIssuesData } = await supabase
    .from("weekly_issues")
    .select("id, week_start, title, status, scheduled_at, published_at")
    .neq("status", "archived")
    .order("week_start", { ascending: false });

  const allIssues = (allIssuesData ?? []) as WeeklyIssue[];
  const liveIssues = allIssues.filter((i) => isLiveIssue(i));
  const pickerSource = isStaff ? allIssues.filter((i) => i.status !== "archived") : liveIssues;

  const requested = weekParam?.match(/^\d{4}-\d{2}-\d{2}$/) ? weekParam : null;
  const defaultWeek = liveIssues[0]?.week_start ?? pickerSource[0]?.week_start ?? null;
  const activeWeek = requested ?? defaultWeek;

  let issue: WeeklyIssueWithSlots | null = null;
  if (activeWeek) {
    const { data } = await supabase
      .from("weekly_issues")
      .select(ISSUE_SELECT)
      .eq("week_start", activeWeek)
      .maybeSingle();
    issue = (data as unknown as WeeklyIssueWithSlots) ?? null;
    if (issue && !isLiveIssue(issue) && !isStaff) {
      issue = null;
    }
  }

  const { data: sectionsData } = await supabase
    .from("sections")
    .select("*")
    .order("position");
  const sections = ((sectionsData ?? []) as Section[]).filter((s) =>
    isPublicSectionSlug(s.slug)
  );

  const { lead, second, rail, inside } = issue
    ? slotsByKind(issue)
    : { lead: null, second: null, rail: [], inside: [] };

  const used = issue ? usedArticleIds(issue) : new Set<string>();

  const { data: highlightData } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);

  const highlights = ((highlightData ?? []) as unknown as ArticleWithMeta[])
    .filter((a) => !used.has(a.id))
    .slice(0, 6);

  const bySection = sections
    .map((s) => ({
      section: s,
      stories: inside
        .filter((x) => x.sectionId === s.id)
        .map((x) => x.article)
        .slice(0, 4),
    }))
    .filter((g) => g.stories.length > 0);

  const weekOptions = pickerSource.map((i) => ({
    weekStart: i.week_start,
    label: formatWeekLabel(i.week_start, locale),
  }));

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
      </header>

      {!lead ? (
        <p className="py-20 text-center text-ink-soft">{t("weeklyEmpty")}</p>
      ) : (
        <>
          <h2 className="mt-8 font-serif text-2xl font-bold">The Front Page</h2>

          <div className="mt-4 grid gap-8 border-b border-rule pb-10 lg:grid-cols-[1.6fr_1fr_1fr]">
            <article className="lg:border-r lg:border-rule lg:pr-8">
              <Link href={`/article/${lead.slug}`} className="headline-link group block">
                {lead.cover_url && (
                  <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden bg-rule">
                    <Image
                      src={lead.cover_url}
                      alt={lead.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}
                {lead.sections && (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    {lead.sections.name}
                  </p>
                )}
                <h3 className="mt-1 font-serif text-3xl font-bold leading-tight group-hover:text-accent md:text-4xl">
                  {lead.title}
                </h3>
                <p className="mt-3 font-serif text-lg leading-snug text-ink-soft">
                  {dek(lead, 240)}
                </p>
              </Link>
              <Byline article={lead} className="mt-3" />
            </article>

            {second && (
              <article className="lg:border-r lg:border-rule lg:pr-8">
                <Link href={`/article/${second.slug}`} className="headline-link group block">
                  {second.cover_url && (
                    <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden bg-rule">
                      <Image
                        src={second.cover_url}
                        alt={second.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  {second.sections && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                      {second.sections.name}
                    </p>
                  )}
                  <h3 className="mt-1 font-serif text-2xl font-bold leading-tight group-hover:text-accent">
                    {second.title}
                  </h3>
                  <p className="mt-2 font-serif leading-snug text-ink-soft">
                    {dek(second)}
                  </p>
                </Link>
                <Byline article={second} className="mt-3" />
              </article>
            )}

            <div className="divide-y divide-rule">
              {rail.map((a) => (
                <article key={a.id} className="py-4 first:pt-0">
                  <Link href={`/article/${a.slug}`} className="headline-link group flex gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-accent">
                        {a.title}
                      </h3>
                      <p className="mt-1 line-clamp-3 font-serif text-sm leading-snug text-ink-soft">
                        {dek(a, 120)}
                      </p>
                    </div>
                    <Thumb a={a} className="h-16 w-20" />
                  </Link>
                  <Byline article={a} className="mt-1.5" />
                </article>
              ))}
            </div>
          </div>

          {bySection.map(({ section, stories }) => (
            <section key={section.id} className="border-b border-rule py-8">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-2xl font-bold">{section.name}</h2>
                <Link
                  href={`/section/${section.slug}`}
                  className="text-[11px] font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
                >
                  All {section.name} →
                </Link>
              </div>
              <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                {stories.map((a) => (
                  <article key={a.id}>
                    <Link href={`/article/${a.slug}`} className="headline-link group block">
                      {a.cover_url && (
                        <div className="relative mb-3 aspect-[3/2] w-full overflow-hidden bg-rule">
                          <Image
                            src={a.cover_url}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, 25vw"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-accent">
                        {a.title}
                      </h3>
                      <p className="mt-1 line-clamp-3 font-serif text-sm leading-snug text-ink-soft">
                        {dek(a, 120)}
                      </p>
                    </Link>
                    <Byline article={a} className="mt-1.5" />
                  </article>
                ))}
              </div>
            </section>
          ))}

          {highlights.length > 0 && (
            <section className="mt-10 border-t-2 border-ink pt-8">
              <h2 className="font-serif text-2xl font-bold">{t("highlights")}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                More recent stories from the paper — pick any to keep reading.
              </p>
              <div className="mt-4 divide-y divide-rule">
                {highlights.map((a) => (
                  <div key={a.id} className="py-4">
                    <CompactStory article={a} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
