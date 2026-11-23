import Image from "next/image";
import Link from "next/link";
import { readingMinutes } from "@/lib/articles";
import { displayByline } from "@/lib/byline";
import type { ArticleWithMeta } from "@/lib/types";

function href(a: ArticleWithMeta) {
  return `/article/${a.slug}`;
}

export function Byline({
  article,
  className = "",
}: {
  article: ArticleWithMeta;
  className?: string;
}) {
  const name = displayByline(article);
  if (!name) return null;
  return (
    <p className={`text-[11px] uppercase tracking-wide text-ink-soft ${className}`}>
      By <span className="font-semibold text-ink">{name}</span>
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
      {readingMinutes(article.body)} min read
    </p>
  );
}

/** Front-page lead: large serif headline, dek, big image.
 *  Mobile follows NYT: kicker → headline → dek → read time → photo.
 *  Desktop keeps photo-above for the editorial spread.
 */
export function LeadStory({ article }: { article: ArticleWithMeta }) {
  return (
    <article>
      <Link href={href(article)} className="headline-link group block">
        {article.cover_url && (
          <div className="relative mb-4 hidden aspect-video w-full overflow-hidden bg-rule md:block">
            <Image
              src={article.cover_url}
              alt={article.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
        )}
        {article.sections && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft md:hidden">
            {article.sections.name}
          </p>
        )}
        <h1 className="font-serif text-[1.75rem] font-bold leading-tight sm:text-3xl md:text-4xl">
          {article.title}
        </h1>
        {article.dek && (
          <p className="mt-3 font-serif text-base leading-snug text-ink-soft sm:text-lg">
            {article.dek}
          </p>
        )}
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Byline article={article} />
        <ReadTime article={article} className="mt-0" />
      </div>
      {article.cover_url && (
        <Link href={href(article)} className="mt-4 block md:hidden">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-rule">
            <Image
              src={article.cover_url}
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
  return (
    <article>
      <Link href={href(article)} className="headline-link block">
        {article.cover_url && (
          <div className={`relative mb-3 ${imageAspect} w-full overflow-hidden bg-rule`}>
            <Image
              src={article.cover_url}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
        )}
        <h2 className="font-serif text-xl font-bold leading-snug">
          {article.title}
        </h2>
        {showDek && article.dek && (
          <p className="mt-2 text-sm leading-normal text-ink-soft">
            {article.dek}
          </p>
        )}
      </Link>
      <ReadTime article={article} />
    </article>
  );
}

/** Compact right-rail item: small thumbnail beside a bold headline. */
export function CompactStory({ article }: { article: ArticleWithMeta }) {
  return (
    <article className="flex gap-3">
      <Link href={href(article)} className="headline-link flex flex-1 flex-col">
        <h3 className="font-serif text-base font-bold leading-snug">
          {article.title}
        </h3>
        {article.sections && (
          <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
            {article.sections.name}
          </span>
        )}
      </Link>
      {article.cover_url && (
        <Link
          href={href(article)}
          className="relative block h-16 w-24 shrink-0 overflow-hidden bg-rule"
        >
          <Image
            src={article.cover_url}
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
        <h3 className="font-serif text-base font-bold leading-snug">
          {article.title}
        </h3>
      </Link>
    </article>
  );
}
