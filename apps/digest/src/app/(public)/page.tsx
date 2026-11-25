import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/AdSlot";
import { FunFactCloud } from "@/components/FunFactCloud";
import { WeatherPanel } from "@/components/WeatherPanel";
import { WordOfTheDay } from "@/components/WordOfTheDay";
import {
  CompactStory,
  LeadStory,
  ListStory,
  StoryCard,
} from "@/components/stories";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import { todaysFact, todaysWord } from "@/lib/campus-lore";
import { digestFeatures, isPublicSectionSlug } from "@/lib/features";
import { fetchCampusWeather } from "@/lib/weather";
import type {
  ArticleWithMeta,
  CampusFact,
  CampusWord,
  FrontPageSlot,
  Section,
} from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const t = await getTranslations("home");

  const [
    { data: articlesData },
    { data: sectionsData },
    { data: slotsData },
    { data: factsData },
    { data: wordsData },
    weather,
  ] = await Promise.all([
      supabase
        .from("articles")
        .select(ARTICLE_PUBLIC_SELECT)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(60),
      supabase.from("sections").select("*").order("position"),
      supabase
        .from("front_page_slots")
        .select("id, kind, article_id, section_id, position, updated_at")
        .order("position"),
      supabase
        .from("campus_facts")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("campus_words")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("created_at"),
      fetchCampusWeather(),
    ]);

  const fact = todaysFact((factsData ?? []) as CampusFact[]);
  const word = todaysWord((wordsData ?? []) as CampusWord[]);

  const articles = (articlesData ?? []) as unknown as ArticleWithMeta[];
  const byId = new Map(articles.map((a) => [a.id, a]));
  const sections = ((sectionsData ?? []) as Section[]).filter((s) =>
    isPublicSectionSlug(s.slug)
  );
  const slots = (slotsData ?? []) as FrontPageSlot[];

  if (articles.length === 0) {
    return (
      <div className="py-24 text-center text-ink-soft">
        <p className="font-serif text-2xl">No stories published yet.</p>
        <p className="mt-2 text-sm max-w-md mx-auto">
          Your Supabase database is connected but empty. Publish stories from the
          newsroom, or load demo fixtures with <code className="text-xs">DEMO_MODE</code>.
        </p>
      </div>
    );
  }

  function fromSlots(kind: FrontPageSlot["kind"], limit = 5) {
    return slots
      .filter((s) => s.kind === kind)
      .sort((a, b) => a.position - b.position)
      .map((s) => byId.get(s.article_id))
      .filter((a): a is ArticleWithMeta => !!a)
      .slice(0, limit);
  }

  const breaking = digestFeatures.breakingNews
    ? fromSlots("breaking", 5)
    : [];
  const topNews = fromSlots("top_news", 5).filter(
    (a) => !breaking.some((b) => b.id === a.id)
  );
  const pageOne = fromSlots("page_one", 1)[0] ?? null;

  const showBreaking = breaking.length > 0;
  const showTopNews = topNews.length > 0;
  const showRail = showBreaking || showTopNews || Boolean(weather);

  const railIds = new Set([...breaking, ...topNews].map((a) => a.id));
  const mainPool = articles.filter((a) => !railIds.has(a.id));
  const lead =
    pageOne && !railIds.has(pageOne.id)
      ? pageOne
      : mainPool[0] ?? articles[0];
  const secondary = mainPool
    .filter((a) => a.id !== lead?.id)
    .slice(0, 2);
  const usedIds = new Set(
    [lead, ...secondary, ...breaking, ...topNews]
      .filter(Boolean)
      .map((a) => a!.id)
  );
  const remaining = articles.filter((a) => !usedIds.has(a.id));
  /** Fill under the 2-up so the main column matches a tall Breaking/Top rail. */
  const underFeatures = remaining.slice(0, showRail ? 8 : 0);

  const sectionHighlight = new Map<number, ArticleWithMeta>();
  for (const s of slots.filter((x) => x.kind === "section_highlight")) {
    const art = byId.get(s.article_id);
    if (art && s.section_id != null) sectionHighlight.set(s.section_id, art);
  }

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
          {underFeatures.length > 0 && (
            <div className="mt-8 space-y-0 border-t border-rule pt-2">
              {underFeatures.map((a) => (
                <ListStory key={a.id} article={a} />
              ))}
            </div>
          )}
        </div>

        {showRail && (
          <aside className="border-t border-rule pt-6 lg:border-t-0 lg:pt-0 lg:pl-8">
            {weather && <WeatherPanel weather={weather} />}

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

      {fact && (
        <div className="mt-12 border-t-2 border-ink">
          <FunFactCloud
            fact={fact}
            kicker={t("didYouKnow")}
            revealLabel={t("revealAnswer")}
            hideLabel={t("hideAnswer")}
          />
        </div>
      )}

      {sections.map((section) => {
        const highlight = sectionHighlight.get(section.id);
        const inDesk = articles.filter(
          (a) =>
            a.section_id === section.id || a.sections?.slug === section.slug
        );
        // Prefer pieces not already used above; fall back so the desk never
        // looks empty when it has published work.
        const unused = inDesk.filter(
          (a) => !usedIds.has(a.id) && a.id !== highlight?.id
        );
        const usedInDesk = inDesk.filter(
          (a) =>
            usedIds.has(a.id) && a.id !== highlight?.id
        );
        const others = [...unused, ...usedInDesk].slice(
          0,
          highlight ? 3 : 4
        );
        const first = highlight ?? others[0];
        const more = highlight ? others : others.slice(1);
        if (!first) return null;

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

      {word && (
        <section className="mt-14 border-t border-rule pt-8">
          <div className="mx-auto max-w-sm">
            <WordOfTheDay
              word={word}
              label={t("wordOfTheDay")}
              revealLabel={t("tapForMeaning")}
              compact
            />
          </div>
        </section>
      )}
    </div>
  );
}
