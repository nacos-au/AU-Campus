import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Byline } from "@/components/stories";
import { WeeklyNameplate } from "@/components/weekly/WeeklyNameplate";
import { WeeklySections } from "@/components/weekly/WeeklySections";
import { articlePublicPath, excerpt } from "@/lib/articles";
import type { ArticleWithMeta } from "@/lib/types";
import type { WeatherSnapshot } from "@/lib/weather";
import type { IssueMeta } from "@/lib/weekly";
import {
  REGION_META,
  disclaimerOf,
  type WeeklyLayout,
  type WeeklySection,
  type WeeklyWidget,
  type WeeklyRegion,
  type WeeklySlotItem,
} from "@/lib/weekly-layout";

/**
 * Hooks the editor passes in so the SAME renderer can show droppable slots.
 * The public page never passes these.
 */
export type WeeklyEditorHooks = {
  shell: (args: {
    region: WeeklyRegion;
    index: number;
    item: WeeklySlotItem | null;
    children: ReactNode;
  }) => ReactNode;
  wrapNameplate: (node: ReactNode) => ReactNode;
  wrapNote: (node: ReactNode | null) => ReactNode;
  /** Wraps each section so it can be selected. */
  wrapSection: (section: WeeklySection, node: ReactNode) => ReactNode;
  /** Wraps each widget so it can be selected. */
  wrapWidget: (widget: WeeklyWidget, node: ReactNode) => ReactNode;
  /** Rendered at the end of each section: the "add widget" controls. */
  sectionFooter: (section: WeeklySection) => ReactNode;
  /** Rendered after the sections: the "add section" control. */
  sectionsFooter: ReactNode;
};

type Props = {
  layout: WeeklyLayout;
  articlesById: Map<string, ArticleWithMeta>;
  meta: IssueMeta;
  weather: WeatherSnapshot | null;
  /** Draft preview: looks like the live page but links are inert. */
  preview?: boolean;
  editor?: WeeklyEditorHooks;
};

function teaserText(
  a: ArticleWithMeta,
  item: WeeklySlotItem,
  chars: number
): string {
  return item.teaser?.trim() || a.dek || excerpt(a.body, chars);
}

function Linked({
  article,
  interactive,
  children,
}: {
  article: ArticleWithMeta;
  interactive: boolean;
  children: ReactNode;
}) {
  if (!interactive) return <div>{children}</div>;
  return (
    <Link href={articlePublicPath(article)} className="headline-link group block">
      {children}
    </Link>
  );
}

function FullStory({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-wider text-accent group-hover:underline ${className}`}
    >
      Read the full story →
    </p>
  );
}

function Disclaimer({ item }: { item: WeeklySlotItem }) {
  const text = disclaimerOf(item);
  if (!text) return null;
  return (
    <p className="mt-2 border-l-2 border-rule-dark pl-2 text-[11px] italic leading-snug text-ink-soft">
      {text}
    </p>
  );
}

function SlotByline({
  article,
  interactive,
  showIt,
}: {
  article: ArticleWithMeta;
  interactive: boolean;
  showIt: boolean;
}) {
  if (!showIt) return null;
  return (
    <div className={interactive ? "" : "pointer-events-none"}>
      <Byline article={article} className="mt-2" />
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-accent @2xl:text-[11px]">
      {children}
    </p>
  );
}

function Cover({
  article,
  className,
  sizes,
}: {
  article: ArticleWithMeta;
  className: string;
  sizes: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-rule ${className}`}>
      <Image
        src={article.cover_url!}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}

function SlotArticle({
  region,
  item,
  article,
  interactive,
  showByline,
}: {
  region: WeeklyRegion;
  item: WeeklySlotItem;
  article: ArticleWithMeta;
  interactive: boolean;
  showByline: boolean;
}) {
  const kicker = item.kicker?.trim() || article.sections?.name;
  const headline = item.headline?.trim() || article.title;
  const showImg = item.showImage !== false && Boolean(article.cover_url);
  const byline = (
    <SlotByline article={article} interactive={interactive} showIt={showByline} />
  );

  if (region === "hero") {
    return (
      <article>
        <Linked article={article} interactive={interactive}>
          <div
            className={
              showImg ? "grid gap-4 @3xl:grid-cols-12 @3xl:items-center @3xl:gap-8" : ""
            }
          >
            {showImg ? (
              <Cover
                article={article}
                className="aspect-[16/10] @3xl:col-span-7"
                sizes="(min-width: 1024px) 60vw, 100vw"
              />
            ) : null}
            <div
              className={
                showImg ? "@3xl:col-span-5" : "mx-auto max-w-3xl text-center"
              }
            >
              <Kicker>{kicker}</Kicker>
              <h2 className="mt-1 font-serif text-3xl font-black leading-[1.05] tracking-tight group-hover:text-accent @2xl:text-4xl @5xl:text-5xl">
                {headline}
              </h2>
              <p className="mt-3 line-clamp-4 font-serif text-base leading-snug text-ink-soft @2xl:text-lg">
                {teaserText(article, item, 260)}
              </p>
              <FullStory className="mt-3" />
            </div>
          </div>
        </Linked>
        {byline}
        <Disclaimer item={item} />
      </article>
    );
  }

  if (region === "lead") {
    return (
      <article>
        <Linked article={article} interactive={interactive}>
          {showImg ? (
            <Cover
              article={article}
              className="mb-3 aspect-[16/9]"
              sizes="(min-width: 1024px) 60vw, 100vw"
            />
          ) : null}
          <Kicker>{kicker}</Kicker>
          <h2 className="mt-1 font-serif text-2xl font-bold leading-tight group-hover:text-accent @2xl:text-3xl">
            {headline}
          </h2>
          <p className="mt-2 line-clamp-5 font-serif text-base leading-snug text-ink-soft">
            {teaserText(article, item, 240)}
          </p>
          <FullStory className="mt-3" />
        </Linked>
        {byline}
        <Disclaimer item={item} />
      </article>
    );
  }

  if (region === "secondary") {
    return (
      <article>
        <Linked article={article} interactive={interactive}>
          {showImg ? (
            <Cover
              article={article}
              className="mb-2.5 aspect-[3/2]"
              sizes="(min-width: 1024px) 33vw, (min-width: 672px) 50vw, 100vw"
            />
          ) : null}
          <Kicker>{kicker}</Kicker>
          <h3 className="mt-1 font-serif text-xl font-bold leading-snug group-hover:text-accent">
            {headline}
          </h3>
          <p className="mt-1.5 line-clamp-3 font-serif text-sm leading-snug text-ink-soft">
            {teaserText(article, item, 150)}
          </p>
          <FullStory className="mt-2" />
        </Linked>
        {byline}
        <Disclaimer item={item} />
      </article>
    );
  }

  // sidebar
  return (
    <article>
      <Linked article={article} interactive={interactive}>
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <Kicker>{kicker}</Kicker>
            <h3 className="mt-0.5 font-serif text-[15px] font-bold leading-snug group-hover:text-accent">
              {headline}
            </h3>
            <p className="mt-1 line-clamp-2 font-serif text-xs leading-snug text-ink-soft">
              {teaserText(article, item, 100)}
            </p>
          </div>
          {showImg ? (
            <div className="relative h-14 w-[4.5rem] shrink-0 overflow-hidden bg-rule">
              <Image
                src={article.cover_url!}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </Linked>
      {byline}
      <Disclaimer item={item} />
    </article>
  );
}

export function WeeklyPage({
  layout,
  articlesById,
  meta,
  weather,
  preview = false,
  editor,
}: Props) {
  const interactive = !preview && !editor;
  const showByline = !editor;

  /** Slots to render for a region: filled ones (public) or filled + next free (edit). */
  function slotsFor(region: WeeklyRegion) {
    const items = layout.regions[region];
    if (!editor) {
      return items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => articlesById.has(item.articleId));
    }
    const cap = REGION_META[region].capacity;
    const n = Math.min(items.length + 1, cap);
    return Array.from({ length: n }, (_, index) => ({
      item: items[index] ?? null,
      index,
    }));
  }

  function renderSlot(
    region: WeeklyRegion,
    { item, index }: { item: WeeklySlotItem | null; index: number },
    wrapperClass = ""
  ) {
    const article = item ? articlesById.get(item.articleId) : undefined;
    const content =
      item && article ? (
        <SlotArticle
          region={region}
          item={item}
          article={article}
          interactive={interactive}
          showByline={showByline}
        />
      ) : item ? (
        <p className="border border-dashed border-rule-dark p-3 text-sm text-ink-soft">
          Story unavailable (unpublished or removed)
        </p>
      ) : null;
    return (
      <div
        key={`${region}-${index}-${item?.articleId ?? "empty"}`}
        className={`min-w-0 ${wrapperClass}`}
      >
        {editor ? editor.shell({ region, index, item, children: content }) : content}
      </div>
    );
  }

  const hero = slotsFor("hero");
  const lead = slotsFor("lead");
  const secondary = slotsFor("secondary");
  const sidebar = slotsFor("sidebar");

  const note = layout.note?.body.trim() ? layout.note : null;
  const showLead = lead.length > 0;
  const showSide = sidebar.length > 0 || Boolean(note) || Boolean(editor);

  const noteNode = note ? (
    <div className="border-b border-rule pb-4">
      {note.byline ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
          {note.byline}
        </p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap font-serif text-base italic leading-relaxed">
        {note.body}
      </p>
    </div>
  ) : null;

  const secondaryCols =
    secondary.length >= 3
      ? "@2xl:grid-cols-2 @5xl:grid-cols-3"
      : secondary.length === 2
        ? "@2xl:grid-cols-2"
        : "";

  const nameplate = (
    <WeeklyNameplate meta={meta} nameplate={layout.nameplate} weather={weather} />
  );

  return (
    <div className="@container">
      <div className="pb-8">
        {editor ? editor.wrapNameplate(nameplate) : nameplate}

        {hero.length > 0 ? (
          <section aria-label="Top story" className="border-b border-rule py-6">
            {hero.map((s) => renderSlot("hero", s))}
          </section>
        ) : null}

        {showLead || showSide ? (
          <div className="grid gap-x-8 gap-y-8 py-6 @5xl:grid-cols-12">
            {showLead ? (
              <section
                aria-label="Lead story"
                className={`min-w-0 ${showSide ? "@5xl:col-span-8" : "@5xl:col-span-12"}`}
              >
                {lead.map((s) => renderSlot("lead", s))}
              </section>
            ) : null}
            {showSide ? (
              <aside
                aria-label="Sidebar"
                className={`min-w-0 ${
                  showLead
                    ? "@5xl:col-span-4 @5xl:border-l @5xl:border-rule @5xl:pl-6"
                    : "@5xl:col-span-12"
                }`}
              >
                {editor ? editor.wrapNote(noteNode) : noteNode}
                <div
                  className={`grid gap-x-6 ${
                    showLead
                      ? "@2xl:grid-cols-2 @5xl:grid-cols-1"
                      : "@2xl:grid-cols-2 @5xl:grid-cols-3"
                  } ${noteNode || editor ? "mt-4" : ""}`}
                >
                  {sidebar.map((s) =>
                    renderSlot(
                      "sidebar",
                      s,
                      "border-t border-rule py-3 first:border-t-0 first:pt-0"
                    )
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        ) : null}

        {secondary.length > 0 ? (
          <section
            aria-label="More stories"
            className={`grid gap-x-6 gap-y-8 border-t-2 border-ink pt-6 ${secondaryCols}`}
          >
            {secondary.map((s) =>
              renderSlot(
                "secondary",
                s,
                "@5xl:border-l @5xl:border-rule @5xl:pl-6 @5xl:first:border-l-0 @5xl:first:pl-0"
              )
            )}
          </section>
        ) : null}

        <WeeklySections
          sections={layout.sections}
          preview={preview || Boolean(editor)}
          wrapSection={editor?.wrapSection}
          wrapWidget={editor?.wrapWidget}
          sectionFooter={editor?.sectionFooter}
          footer={editor?.sectionsFooter}
        />
      </div>
    </div>
  );
}
