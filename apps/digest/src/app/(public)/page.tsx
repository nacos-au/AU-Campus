import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/AdSlot";
import {
  CompactStory,
  LeadStory,
  ListStory,
  OpinionStory,
  StoryCard,
} from "@/components/stories";
import { formatNaira } from "@/lib/site";
import type { ArticleWithMeta, Edition, Section } from "@/lib/types";
import { isDemoMode } from "@/lib/demo-mode";
import { getDemoModeCookie } from "@/app/actions/demo-mode";

export default async function HomePage() {
  const demoCookie = await getDemoModeCookie();
  const demoActive = isDemoMode(demoCookie);
  const supabase = await createClient();
  const t = await getTranslations("home");

  const ARTICLE_SELECT =
    "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username)";

  const [{ data: articlesData }, { data: sectionsData }, { data: editionsData }] =
    await Promise.all([
      supabase
        .from("articles")
        .select(ARTICLE_SELECT)
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(40),
      supabase.from("sections").select("*").order("position"),
      supabase
        .from("editions")
        .select("*")
        .eq("published", true)
        .order("issue_date", { ascending: false })
        .limit(3),
    ]);

  const articles = (articlesData ?? []) as unknown as ArticleWithMeta[];
  const sections = (sectionsData ?? []) as Section[];
  const editions = (editionsData ?? []) as Edition[];

  if (articles.length === 0) {
    return (
      <div className="py-24 text-center text-ink-soft">
        <p className="font-serif text-2xl">No stories published yet.</p>
        <p className="mt-2 text-sm max-w-md mx-auto">
          {demoActive
            ? "Demo fixtures failed to load — try refreshing. If this persists, report a bug."
            : "Your Supabase database is connected but empty. Run the SQL migrations and seed in the Supabase SQL editor, or use Demo/Live in the page footer for sample stories."}
        </p>
        {!demoActive && (
          <p className="mt-4 text-xs">
            Newsroom:{" "}
            <a href="/admin" className="font-semibold text-ink underline underline-offset-2">
              sign in and publish
            </a>{" "}
            after creating an account.
          </p>
        )}
      </div>
    );
  }

  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 2);
  const topNews = rest.slice(2, 7);
  const opinion = articles
    .filter((a) => a.sections?.slug === "opinion")
    .slice(0, 3);
  const usedIds = new Set(
    [lead, ...secondary, ...topNews, ...opinion].map((a) => a.id)
  );
  const remaining = articles.filter((a) => !usedIds.has(a.id));

  return (
    <div className="py-4 md:py-6">
      {/* ── Above the fold: lead + secondary | top news rail ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:divide-x lg:divide-rule">
        <div className="lg:col-span-2 lg:pr-8">
          <LeadStory article={lead} />
          {secondary.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-8 border-t border-rule pt-8 sm:grid-cols-2 sm:gap-6 sm:divide-x sm:divide-rule sm:pt-6">
              {secondary.map((a, i) => (
                <div key={a.id} className={i === 1 ? "sm:pl-6" : ""}>
                  <StoryCard article={a} />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="border-t border-rule pt-6 lg:border-t-0 lg:pt-0 lg:pl-8">
          <h2 className="border-b-2 border-ink pb-2 text-sm font-bold uppercase tracking-wider">
            <span className="mr-2 inline-block h-2.5 w-2.5 bg-accent" />
            {t("topNews")}
          </h2>
          <div className="divide-y divide-rule">
            {topNews.map((a) => (
              <div key={a.id} className="py-4">
                <CompactStory article={a} />
              </div>
            ))}
          </div>
          <AdSlot slot="sidebar" className="mt-6" />
        </aside>
      </div>

      <AdSlot slot="leaderboard" className="mt-12 border-t border-rule pt-8" />

      {/* ── Opinion ── */}
      {opinion.length > 0 && (
        <section className="mt-12 border-t-2 border-ink pt-6">
          <h2 className="mb-6 font-serif text-2xl font-bold">{t("opinion")}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:divide-x sm:divide-rule">
            {opinion.map((a, i) => (
              <div key={a.id} className={i > 0 ? "sm:pl-8" : ""}>
                <OpinionStory article={a} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Editions promo ── */}
      {editions.length > 0 && (
        <section className="mt-12 bg-accent-soft px-6 py-8 sm:px-10">
          <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <h2 className="font-serif text-2xl font-bold">
                {t("editionsPromo")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                {t("editionsPromoBody")}
              </p>
              <Link
                href="/editions"
                className="mt-4 inline-block bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors"
              >
                {t("browseEditions")} · {formatNaira(editions[0].price_kobo)}
              </Link>
            </div>
            <div className="flex justify-center gap-4 sm:justify-end">
              {editions.slice(0, 2).map((e, i) => (
                <div
                  key={e.id}
                  className={`relative aspect-[8/11] w-28 shrink-0 border border-rule-dark bg-paper shadow-md sm:w-32 ${
                    i === 1 ? "hidden sm:block -rotate-2" : "rotate-1"
                  }`}
                >
                  {e.cover_url && (
                    <Image
                      src={e.cover_url}
                      alt={e.title}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section blocks ── */}
      {sections.map((section) => {
        const sectionArticles = remaining
          .filter((a) => a.sections?.slug === section.slug)
          .slice(0, 4);
        if (sectionArticles.length === 0) return null;
        const [first, ...more] = sectionArticles;

        return (
          <section key={section.id} className="mt-12 border-t-2 border-ink pt-6">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-serif text-2xl font-bold">{section.name}</h2>
              <Link
                href={`/section/${section.slug}`}
                className="text-xs font-semibold uppercase tracking-wider text-accent hover:text-accent-hover"
              >
                {t("moreIn")} {section.name} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:divide-x sm:divide-rule">
              <div className="sm:col-span-2 sm:pr-8">
                <StoryCard article={first} imageAspect="aspect-[4/3] sm:aspect-video" />
              </div>
              <div className="space-y-3">
                {more.map((a) => (
                  <ListStory key={a.id} article={a} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
