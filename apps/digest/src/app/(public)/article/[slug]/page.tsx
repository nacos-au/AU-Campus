import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/AdSlot";
import { RichText } from "@/components/RichText";
import { LikeShare } from "@/components/LikeShare";
import { creditPeople, displayByline, seriesHref } from "@/lib/byline";
import { CompactStory } from "@/components/stories";
import { ARTICLE_PUBLIC_SELECT, readingMinutes } from "@/lib/articles";
import { digestFeatures } from "@/lib/features";
import type { ArticleWithMeta } from "@/lib/types";

export const revalidate = 60;

async function getArticle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as unknown as ArticleWithMeta | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.dek ?? undefined,
    openGraph: {
      title: article.title,
      description: article.dek ?? undefined,
      images: article.cover_url ? [article.cover_url] : undefined,
      type: "article",
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, locale] = await Promise.all([getArticle(slug), getLocale()]);
  if (!article) notFound();

  const supabase = await createClient();
  const { data: relatedData } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
    .eq("status", "published")
    .eq("section_id", article.section_id)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(4);
  const related = (relatedData ?? []) as unknown as ArticleWithMeta[];

  const published = article.published_at
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(article.published_at))
    : "";

  const credit = displayByline(article);
  const people = creditPeople(article);
  const series = article.article_series;
  const seriesLink = seriesHref(series);
  const aliasCredit = article.byline_mode === "alias";

  return (
    <div className="py-8">
      <article className="mx-auto max-w-3xl">
        {article.sections && (
          <Link
            href={`/section/${article.sections.slug}`}
            className="text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
          >
            {article.sections.name}
          </Link>
        )}

        <h1
          className={`mt-3 font-serif font-bold leading-tight ${
            article.cover_url
              ? "text-3xl sm:text-5xl sm:leading-tight"
              : "text-[2rem] sm:text-[3.25rem] sm:leading-[1.12]"
          }`}
        >
          {article.title}
        </h1>

        {article.dek && (
          <p
            className={`mt-4 font-serif leading-snug text-ink-soft ${
              article.cover_url ? "text-xl" : "text-xl sm:text-2xl"
            }`}
          >
            {article.dek}
          </p>
        )}

        <div
          className={`mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-xs text-ink-soft ${
            article.cover_url
              ? "border-y border-rule"
              : "border-t border-ink border-b border-rule"
          }`}
        >
          {(credit || series) && (
            <span>
              {credit && (
                <>
                  By{" "}
                  {aliasCredit ? (
                    <span className="font-semibold text-ink">{credit}</span>
                  ) : (
                    people.map((p, i) => {
                      const sep =
                        i === 0 ? null : i === people.length - 1 ? " and " : ", ";
                      return (
                        <span key={`${p.display_name}-${i}`}>
                          {sep}
                          {p.username ? (
                            <Link
                              href={`/author/${p.username}`}
                              className="font-semibold text-ink hover:text-accent"
                            >
                              {p.display_name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-ink">
                              {p.display_name}
                            </span>
                          )}
                        </span>
                      );
                    })
                  )}
                </>
              )}
              {credit && series && seriesLink && (
                <span className="text-ink-soft"> · </span>
              )}
              {series && seriesLink && (
                <Link
                  href={seriesLink}
                  className="font-semibold text-ink hover:text-accent"
                >
                  {series.title}
                </Link>
              )}
            </span>
          )}
          <span>{published}</span>
          {article.content_updated_at &&
            article.published_at &&
            new Date(article.content_updated_at).getTime() >
              new Date(article.published_at).getTime() + 60_000 && (
              <span>
                Updated{" "}
                {new Intl.DateTimeFormat(locale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(article.content_updated_at))}
              </span>
            )}
          <span>
            {readingMinutes(article.body, {
              extraImages: article.cover_url ? 1 : 0,
            })}{" "}
            min read
          </span>
        </div>

        {article.cover_url && (
          <figure className="mt-6">
            <div className="relative aspect-video w-full overflow-hidden bg-rule">
              <Image
                src={article.cover_url}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          </figure>
        )}

        <div className={article.cover_url ? "mt-8" : "mt-10"}>
          <RichText doc={article.body} />
        </div>

        {digestFeatures.publicLikes && (
          <LikeShare
            articleId={article.id}
            initialLikes={article.like_count ?? 0}
            title={article.title}
          />
        )}
      </article>

      <div className="mx-auto max-w-3xl">
        <AdSlot slot="infeed" className="mt-12 border-t border-rule pt-8" />
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-14 max-w-3xl border-t-2 border-ink pt-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">
            More in {article.sections?.name}
          </h2>
          <div className="divide-y divide-rule">
            {related.map((a) => (
              <div key={a.id} className="py-4">
                <CompactStory article={a} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
