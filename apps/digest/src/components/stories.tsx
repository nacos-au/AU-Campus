import Image from "next/image";
import Link from "next/link";
import { articlePublicPath, readingMinutes } from "@/lib/articles";
import { creditPeople, displayByline, seriesHref } from "@/lib/byline";
import type { ArticleWithMeta } from "@/lib/types";

function href(a: ArticleWithMeta) {
  return articlePublicPath(a);
}

function CreditNames({ article }: { article: ArticleWithMeta }) {
  const alias = article.byline_mode === "alias";
  if (alias) {
    const name = displayByline(article);
    if (!name) return null;
    return <span className="font-semibold text-ink">{name}</span>;
  }
  const people = creditPeople(article);
  if (people.length === 0) return null;

  return (
    <>
      {people.map((p, i) => {
        const sep =
          i === 0
            ? null
            : i === people.length - 1
              ? " and "
              : ", ";
        const node = p.username ? (
          <Link
            key={`${p.username}-${i}`}
            href={`/author/${p.username}`}
            className="font-semibold text-ink hover:text-accent"
          >
            {p.display_name}
          </Link>
        ) : (
          <span key={`${p.display_name}-${i}`} className="font-semibold text-ink">
            {p.display_name}
          </span>
        );
        return (
          <span key={`credit-${i}`}>
            {sep}
            {node}
          </span>
        );
      })}
    </>
  );
}

export function Byline({
  article,
  className = "",
}: {
  article: ArticleWithMeta;
  className?: string;
}) {
  const name = displayByline(article);
  const series = article.article_series;
  const seriesLink = seriesHref(series);
  if (!name && !series) return null;
  return (
    <p className={`text-[11px] uppercase tracking-wide text-ink-soft ${className}`}>
      {name && (
        <>
          By <CreditNames article={article} />
        </>
      )}
      {name && series && seriesLink && " · "}
      {series && seriesLink && (
        <Link
          href={seriesLink}
          className="font-semibold text-ink hover:text-accent"
        >
          {series.title}
        </Link>
      )}
    </p>
  );
}

export function ReadTime({
  article,
  className = "mt-1.5",
}: {
  article: ArticleWithMeta;
  className?: string;
}) {
  return (
    <p
      className={`text-[11px] uppercase tracking-wide text-ink-soft ${className}`}
    >
      {readingMinutes(article.body, {
        extraImages: article.cover_url ? 1 : 0,
      })}{" "}
      min read
    </p>
  );
}

/** Front-page lead: large serif headline, dek, big image.
 *  Mobile follows NYT: kicker → headline → dek → read time → photo.
 *  Desktop keeps photo-above for the editorial spread.
 *  No cover: text-led package with kicker + stronger type (no empty image hole).
 */
export function LeadStory({ article }: { article: ArticleWithMeta }) {
  const hasCover = Boolean(article.cover_url);
  return (
    <article className={hasCover ? undefined : "border-b border-ink pb-5"}>
      <Link href={href(article)} className="headline-link group block">
        {hasCover && (
          <div className="relative mb-4 hidden aspect-video w-full overflow-hidden bg-rule md:block">
            <Image
              src={article.cover_url!}
              alt={article.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
        )}
        {article.sections && (
          <p
            className={`mb-2 text-[11px] font-bold uppercase tracking-wider text-accent ${
              hasCover ? "md:hidden" : ""
            }`}
          >
            {article.sections.name}
          </p>
        )}
        <h1
          className={`font-serif font-bold leading-tight ${
            hasCover
              ? "text-[1.75rem] sm:text-3xl md:text-4xl"
              : "text-[1.85rem] sm:text-3xl md:text-[2.65rem] md:leading-[1.15]"
          }`}
        >
          {article.title}
        </h1>
        {article.dek && (
          <p
            className={`mt-3 font-serif leading-snug text-ink-soft ${
              hasCover
                ? "text-base sm:text-lg"
                : "text-base sm:text-lg md:text-xl md:leading-snug"
            }`}
          >
            {article.dek}
          </p>
        )}
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Byline article={article} />
        <ReadTime article={article} className="mt-0" />
      </div>
      {hasCover && (
        <Link href={href(article)} className="mt-4 block md:hidden">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-rule">
            <Image
              src={article.cover_url!}
              alt={article.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Link>
      )}
    </article>
  );
}

/** Standard card: image on top, serif headline, optional dek. */
export function StoryCard({
  article,
  showDek = true,
  imageAspect = "aspect-video",
}: {
  article: ArticleWithMeta;
  showDek?: boolean;
  imageAspect?: string;
}) {
  const hasCover = Boolean(article.cover_url);
  return (
    <article className={hasCover ? undefined : "border-t border-rule pt-3"}>
      <Link href={href(article)} className="headline-link block">
        {hasCover && (
          <div className={`relative mb-3 ${imageAspect} w-full overflow-hidden bg-rule`}>
            <Image
              src={article.cover_url!}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
        )}
        {!hasCover && article.sections && (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            {article.sections.name}
          </p>
        )}
        <h2
          className={`font-serif font-bold leading-snug ${
            hasCover ? "text-xl" : "text-[1.35rem]"
          }`}
        >
          {article.title}
        </h2>
        {showDek && article.dek && (
          <p
            className={`mt-2 leading-normal text-ink-soft ${
              hasCover ? "text-sm" : "font-serif text-sm"
            }`}
          >
            {article.dek}
          </p>
        )}
      </Link>
      <ReadTime article={article} />
    </article>
  );
}

/** Compact right-rail item: small thumbnail beside a bold headline. */
export function CompactStory({
  article,
  showEngagement = false,
}: {
  article: ArticleWithMeta;
  showEngagement?: boolean;
}) {
  const hasCover = Boolean(article.cover_url);
  const likes = article.like_count ?? 0;
  const saves = article.save_count ?? 0;
  return (
    <article
      className={
        hasCover
          ? "flex gap-3"
          : "border-t border-rule pt-3 first:border-t-0 first:pt-0"
      }
    >
      <Link href={href(article)} className="headline-link flex flex-1 flex-col">
        {article.sections && (
          <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
            {article.sections.name}
          </span>
        )}
        <h3
          className={`font-serif font-bold leading-snug ${
            hasCover ? "text-base" : "text-[15px]"
          }`}
        >
          {article.title}
        </h3>
        {showEngagement && (
          <p className="mt-1.5 text-[11px] uppercase tracking-wide text-ink-soft">
            {likes} {likes === 1 ? "like" : "likes"}
            {" · "}
            {saves} {saves === 1 ? "save" : "saves"}
          </p>
        )}
      </Link>
      {hasCover && (
        <Link
          href={href(article)}
          className="relative block h-16 w-24 shrink-0 overflow-hidden bg-rule"
        >
          <Image
            src={article.cover_url!}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        </Link>
      )}
    </article>
  );
}

/** Opinion piece: accent author name, italic serif headline, no image. */
export function OpinionStory({ article }: { article: ArticleWithMeta }) {
  return (
    <article>
      <Link href={href(article)} className="headline-link block">
        {article.profiles?.display_name && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-accent">
            {article.profiles.display_name}
          </p>
        )}
        <h3 className="font-serif text-lg font-bold italic leading-snug">
          {article.title}
        </h3>
        {article.dek && (
          <p className="mt-2 text-sm text-ink-soft">{article.dek}</p>
        )}
      </Link>
      <ReadTime article={article} />
    </article>
  );
}

/** Text-only list row with a top rule, used in section stacks. */
export function ListStory({ article }: { article: ArticleWithMeta }) {
  return (
    <article className="border-t border-rule pt-3">
      <Link href={href(article)} className="headline-link block">
        {article.sections && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
            {article.sections.name}
          </p>
        )}
        <h3 className="font-serif text-[15px] font-bold leading-snug">
          {article.title}
        </h3>
        {article.dek && (
          <p className="mt-1 line-clamp-2 font-serif text-sm leading-snug text-ink-soft">
            {article.dek}
          </p>
        )}
      </Link>
    </article>
  );
}
