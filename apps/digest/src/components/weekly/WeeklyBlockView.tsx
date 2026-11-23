import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Byline } from "@/components/stories";
import { excerpt } from "@/lib/articles";
import type { WeeklyBlock } from "@/lib/weekly-layout";
import { articleVariant, spanClass } from "@/lib/weekly-layout";
import type { ArticleWithMeta } from "@/lib/types";

type Props = {
  block: WeeklyBlock;
  articlesById: Map<string, ArticleWithMeta>;
  /** When true, wrap in editable chrome (no links). */
  preview?: boolean;
};

function dek(a: ArticleWithMeta, teaser?: string, chars = 160) {
  return teaser?.trim() || a.dek || excerpt(a.body, chars);
}

export function WeeklyBlockView({ block, articlesById, preview }: Props) {
  const wrap = (child: ReactNode, extraClass = "") => (
    <div className={`${spanClass(block.span)} min-w-0 ${extraClass}`}>{child}</div>
  );

  switch (block.type) {
    case "intro":
      return wrap(
        <div className="border-b border-rule pb-5 md:border-b-0 md:border-r md:border-rule md:pb-0 md:pr-6">
          {block.byline ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
              {block.byline}
            </p>
          ) : null}
          <p className="mt-2 font-serif text-base leading-relaxed text-ink md:text-lg whitespace-pre-wrap">
            {block.body || (preview ? "Intro…" : "")}
          </p>
        </div>
      );
    case "heading":
      return wrap(
        <h2 className="border-b border-ink pb-2 font-serif text-xl font-bold tracking-tight md:text-2xl">
          {block.text || (preview ? "Heading" : "")}
        </h2>
      );
    case "text":
      return wrap(
        <p className="font-serif text-[15px] leading-relaxed text-ink-soft whitespace-pre-wrap md:text-base">
          {block.body || (preview ? "Text…" : "")}
        </p>
      );
    case "divider":
      return wrap(<hr className="border-ink/50" />);
    case "spacer":
      return wrap(
        <div
          className={
            block.size === "sm" ? "h-3" : block.size === "lg" ? "h-12" : "h-6"
          }
          aria-hidden
        />
      );
    case "image":
      return wrap(
        <figure>
          {block.url ? (
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-rule">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.url}
                alt={block.caption || ""}
                className="h-full w-full object-cover"
              />
            </div>
          ) : preview ? (
            <div className="flex aspect-[16/10] items-center justify-center bg-rule text-sm text-ink-soft">
              Image URL
            </div>
          ) : null}
          {block.caption ? (
            <figcaption className="mt-1.5 text-xs italic text-ink-soft">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "article": {
      const a = articlesById.get(block.articleId);
      if (!a) {
        return wrap(
          <div className="border border-dashed border-rule p-3 text-sm text-ink-soft">
            {preview ? "Pick an article" : "Story unavailable"}
          </div>
        );
      }
      const variant = articleVariant(block);
      const kicker = block.kicker?.trim() || a.sections?.name;
      const headline = block.headline?.trim() || a.title;
      const teaserChars =
        variant === "lead" ? 220 : variant === "feature" ? 140 : 90;
      const teaserLines =
        variant === "lead"
          ? "line-clamp-5"
          : variant === "feature"
            ? "line-clamp-3"
            : "line-clamp-2";
      const hedClass =
        variant === "lead"
          ? "mt-1 font-serif text-2xl font-bold leading-tight md:text-3xl"
          : variant === "feature"
            ? "mt-1 font-serif text-xl font-bold leading-snug"
            : "mt-1 font-serif text-lg font-bold leading-snug";

      const showImg = block.showImage !== false && Boolean(a.cover_url);
      const columnThumb = variant === "column" && showImg;

      const inner = columnThumb ? (
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            {kicker ? (
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                {kicker}
              </p>
            ) : null}
            <h3 className={`${hedClass} group-hover:text-accent`}>{headline}</h3>
            <p
              className={`mt-1.5 font-serif text-sm leading-snug text-ink-soft ${teaserLines}`}
            >
              {dek(a, block.teaser, teaserChars)}
            </p>
            {!preview && <Byline article={a} className="mt-1.5" />}
          </div>
          <div className="relative h-16 w-20 shrink-0 overflow-hidden bg-rule">
            <Image
              src={a.cover_url!}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        </div>
      ) : (
        <>
          {showImg && variant !== "column" ? (
            <div
              className={`relative mb-2.5 w-full overflow-hidden bg-rule ${
                variant === "lead" ? "aspect-[16/9]" : "aspect-[3/2]"
              }`}
            >
              <Image
                src={a.cover_url!}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          ) : null}
          {kicker ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {kicker}
            </p>
          ) : !showImg && a.sections?.name ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {a.sections.name}
            </p>
          ) : null}
          <h3
            className={`${hedClass} ${
              !showImg && variant === "lead" ? "md:text-[2rem]" : ""
            } group-hover:text-accent`}
          >
            {headline}
          </h3>
          <p
            className={`mt-1.5 font-serif leading-snug text-ink-soft ${
              variant === "lead" ? "text-base" : "text-sm"
            } ${teaserLines}`}
          >
            {dek(a, block.teaser, teaserChars)}
          </p>
          {!preview && <Byline article={a} className="mt-1.5" />}
        </>
      );

      return wrap(
        preview ? (
          <div>{inner}</div>
        ) : (
          <Link href={`/article/${a.slug}`} className="headline-link group block">
            {inner}
          </Link>
        ),
        "md:border-r md:border-rule md:pr-4 last:md:border-r-0"
      );
    }
    case "articleStack": {
      const items = block.articleIds
        .map((id) => articlesById.get(id))
        .filter((a): a is ArticleWithMeta => !!a);
      return wrap(
        <div className="divide-y divide-rule md:pl-1">
          {block.title ? (
            <p className="border-b-2 border-ink pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink">
              {block.title}
            </p>
          ) : null}
          {items.length === 0 && preview ? (
            <p className="py-3 text-sm text-ink-soft">Add stories to stack</p>
          ) : null}
          {items.map((a) => {
            const row = (
              <div className="flex gap-2.5 py-2.5">
                <div className="min-w-0 flex-1">
                  {a.sections?.name ? (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      {a.sections.name}
                    </p>
                  ) : null}
                  <h3 className="font-serif text-[15px] font-bold leading-snug group-hover:text-accent">
                    {a.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 font-serif text-xs leading-snug text-ink-soft">
                    {dek(a, undefined, 90)}
                  </p>
                </div>
                {a.cover_url ? (
                  <div className="relative h-12 w-14 shrink-0 overflow-hidden bg-rule">
                    <Image
                      src={a.cover_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                ) : null}
              </div>
            );
            return preview ? (
              <div key={a.id}>{row}</div>
            ) : (
              <Link
                key={a.id}
                href={`/article/${a.slug}`}
                className="headline-link group block"
              >
                {row}
              </Link>
            );
          })}
        </div>
      );
    }
    default:
      return null;
  }
}
