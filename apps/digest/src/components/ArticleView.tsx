import Image from "next/image";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { ImageInfo } from "@/components/ImageInfo";
import { RichText } from "@/components/RichText";
import { LikeShare } from "@/components/LikeShare";
import { CompactStory } from "@/components/stories";
import { creditPeople, displayByline, seriesHref } from "@/lib/byline";
import { readingMinutes } from "@/lib/articles";
import { digestFeatures } from "@/lib/features";
import type { ArticleWithMeta } from "@/lib/types";

export function ArticleView({
  article,
  related,
  published,
  locale,
}: {
  article: ArticleWithMeta;
  related: ArticleWithMeta[];
  published: string;
  locale: string;
}) {
  const credit = displayByline(article);
  const people = creditPeople(article);
  const series = article.article_series;
  const seriesLink = seriesHref(series);
  const aliasCredit = article.byline_mode === "alias";
  const hasCover = Boolean(article.cover_url);

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

        {hasCover && (
          <figure className="mt-4">
            <ImageInfo
              description={article.cover_caption}
              className="aspect-video w-full overflow-hidden bg-rule"
            >
              <Image
                src={article.cover_url!}
                alt={article.cover_caption?.trim() || article.title}
                fill
                priority
                quality={80}
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </ImageInfo>
          </figure>
        )}

        <h1
          className={`font-serif font-bold leading-tight ${
            hasCover
              ? "mt-6 text-3xl sm:text-4xl sm:leading-tight"
              : "mt-3 text-[1.85rem] sm:text-[2.75rem] sm:leading-[1.12]"
          }`}
        >
          {article.title}
        </h1>

        {article.dek && (
          <p
            className={`mt-4 font-serif leading-snug text-ink-soft ${
              hasCover ? "text-lg sm:text-xl" : "text-lg sm:text-xl"
            }`}
          >
            {article.dek}
          </p>
        )}

        <div
          className={`mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-xs text-ink-soft ${
            hasCover
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
              extraImages: hasCover ? 1 : 0,
            })}{" "}
            min read
          </span>
        </div>

        <div className={hasCover ? "mt-8" : "mt-10"}>
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
