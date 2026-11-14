import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/AdSlot";
import {
  CompactStory,
  LeadStory,
  ListStory,
  StoryCard,
} from "@/components/stories";
import { promoteDueEmbargoes } from "@/lib/articles";
import { digestFeatures, isPublicSectionSlug } from "@/lib/features";
import type { ArticleWithMeta, Section } from "@/lib/types";
import { isDemoMode } from "@/lib/demo-mode";
import { getDemoModeCookie } from "@/app/actions/demo-mode";

export default async function HomePage() {
  const demoCookie = await getDemoModeCookie();
  const demoActive = isDemoMode(demoCookie);
  const supabase = await createClient();
  const t = await getTranslations("home");
  await promoteDueEmbargoes(supabase);

  const ARTICLE_SELECT =
    "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username)";

  const [{ data: articlesData }, { data: sectionsData }] = await Promise.all([
    supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(40),
    supabase.from("sections").select("*").order("position"),
  ]);

  const articles = (articlesData ?? []) as unknown as ArticleWithMeta[];
  const sections = ((sectionsData ?? []) as Section[]).filter((s) =>
    isPublicSectionSlug(s.slug)
  );

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

  // Only explicit flags — never invent a rail from leftovers.
  const breaking = digestFeatures.breakingNews
    ? articles.filter((a) => a.breaking).slice(0, 5)
    : [];
  const topNews = articles
    .filter((a) => a.featured && !breaking.some((b) => b.id === a.id))
    .slice(0, 5);

  const showBreaking = breaking.length > 0;
  const showTopNews = topNews.length > 0;
  const showRail = showBreaking || showTopNews;

  const railIds = new Set([...breaking, ...topNews].map((a) => a.id));
  const mainPool = articles.filter((a) => !railIds.has(a.id));
  const [lead, ...rest] = mainPool.length > 0 ? mainPool : articles;
  const secondary = rest.slice(0, 2);
  const usedIds = new Set(
    [lead, ...secondary, ...breaking, ...topNews].filter(Boolean).map((a) => a.id)
  );
  const remaining = articles.filter((a) => !usedIds.has(a.id));

  return (
    <div className="py-4 md:py-6">
      <div
        className={
          showRail
            ? "grid grid-cols-1 gap-8 lg:grid-cols-3 lg:divide-x lg:divide-rule"
            : "grid grid-cols-1"
        }
      >
        <div className={showRail ? "lg:col-span-2 lg:pr-8" : ""}>
          {lead && <LeadStory article={lead} />}
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

        {showRail && (
          <aside className="border-t border-rule pt-6 lg:border-t-0 lg:pt-0 lg:pl-8">
            {showBreaking && (
              <div className={showTopNews ? "mb-8" : ""}>
                <h2 className="border-b-2 border-accent pb-2 text-sm font-bold uppercase tracking-wider text-accent">
                  <span className="mr-2 inline-block h-2.5 w-2.5 bg-accent" />
                  {t("breakingNews")}
                </h2>
                <div className="divide-y divide-rule">
                  {breaking.map((a) => (
                    <div key={a.id} className="py-4">
                      <CompactStory article={a} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showTopNews && (
              <>
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
              </>
            )}

            {digestFeatures.manualAds && (
              <AdSlot slot="sidebar" className="mt-6" />
            )}
          </aside>
        )}
      </div>

      {digestFeatures.manualAds && (
        <AdSlot slot="leaderboard" className="mt-12 border-t border-rule pt-8" />
      )}

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
