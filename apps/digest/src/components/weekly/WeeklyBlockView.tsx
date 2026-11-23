import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Byline } from "@/components/stories";
import { excerpt } from "@/lib/articles";
import type { WeeklyBlock } from "@/lib/weekly-layout";
import { spanClass } from "@/lib/weekly-layout";
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
  const wrap = (child: ReactNode) => (
    <div className={`${spanClass(block.span)} min-w-0`}>{child}</div>
  );

  switch (block.type) {
    case "intro":
      return wrap(
        <div className="border-b border-rule pb-6 md:border-b-0 md:pb-0">
          {block.byline ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {block.byline}
            </p>
          ) : null}
          <p className="mt-3 font-serif text-lg leading-relaxed text-ink md:text-xl whitespace-pre-wrap">
            {block.body || (preview ? "Intro…" : "")}
          </p>
        </div>
      );
    case "heading":
      return wrap(
        <h2 className="font-serif text-2xl font-bold md:text-3xl">
          {block.text || (preview ? "Heading" : "")}
        </h2>
      );
    case "text":
      return wrap(
        <p className="font-serif text-base leading-relaxed text-ink-soft whitespace-pre-wrap md:text-lg">
          {block.body || (preview ? "Text…" : "")}
        </p>
      );
    case "divider":
      return wrap(<hr className="border-ink/40" />);
    case "spacer":
      return wrap(
        <div
          className={
            block.size === "sm" ? "h-4" : block.size === "lg" ? "h-16" : "h-8"
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
            <figcaption className="mt-2 text-sm italic text-ink-soft">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "article": {
      const a = articlesById.get(block.articleId);
      if (!a) {
        return wrap(
          <div className="border border-dashed border-rule p-4 text-sm text-ink-soft">
            {preview ? "Pick an article" : "Story unavailable"}
          </div>
        );
      }
      const inner = (
        <>
          {block.showImage !== false && a.cover_url ? (
            <div className="relative mb-3 aspect-[16/10] w-full overflow-hidden bg-rule">
              <Image
                src={a.cover_url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ) : null}
          {a.sections?.name ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
              {a.sections.name}
            </p>
          ) : null}
          <h3
            className={`mt-1 font-serif font-bold leading-tight ${
              block.span >= 8 ? "text-2xl md:text-3xl" : "text-xl"
            }`}
          >
            {a.title}
          </h3>
          <p className="mt-2 line-clamp-4 font-serif leading-snug text-ink-soft">
            {dek(a, block.teaser)}
          </p>
          {!preview && <Byline article={a} className="mt-2" />}
        </>
      );
      return wrap(
        preview ? (
          <div>{inner}</div>
        ) : (
          <Link href={`/article/${a.slug}`} className="headline-link group block">
            {inner}
          </Link>
        )
      );
    }
    case "articleStack": {
      const items = block.articleIds
        .map((id) => articlesById.get(id))
        .filter((a): a is ArticleWithMeta => !!a);
      return wrap(
        <div className="divide-y divide-rule">
          {block.title ? (
            <p className="pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              {block.title}
            </p>
          ) : null}
          {items.length === 0 && preview ? (
            <p className="py-3 text-sm text-ink-soft">Add stories to stack</p>
          ) : null}
          {items.map((a) => {
            const row = (
              <div className="flex gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-base font-bold leading-snug">
                    {a.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 font-serif text-sm text-ink-soft">
                    {dek(a, undefined, 100)}
                  </p>
                </div>
                {a.cover_url ? (
                  <div className="relative h-14 w-16 shrink-0 overflow-hidden bg-rule">
                    <Image src={a.cover_url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                ) : null}
              </div>
            );
            return preview ? (
              <div key={a.id}>{row}</div>
            ) : (
              <Link key={a.id} href={`/article/${a.slug}`} className="headline-link block">
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
