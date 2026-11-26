import Link from "next/link";
import type { ReactNode } from "react";
import { RichText } from "@/components/RichText";
import { ScoresBlock } from "@/components/weekly/ScoresBlock";
import { isExternalHref, safeHref } from "@/lib/safe-link";
import type {
  RichDoc,
  WeeklySection,
  WeeklyWidget,
} from "@/lib/weekly-layout";

function hasText(doc?: RichDoc): boolean {
  const walk = (nodes?: RichDoc["content"]): boolean =>
    (nodes ?? []).some((n) => Boolean(n.text?.trim()) || walk(n.content));
  return walk(doc?.content);
}

/** Would a reader see anything? Unfinished widgets stay hidden from readers. */
export function widgetHasContent(w: WeeklyWidget): boolean {
  switch (w.type) {
    case "story":
      return Boolean(w.headline.trim());
    case "editorsNote":
      return hasText(w.doc);
    case "scores":
      return w.rows.some((r) => r.home || r.away);
    case "brief":
      return Boolean(w.title.trim()) || hasText(w.doc);
    case "text":
      return hasText(w.doc);
    case "note":
      return Boolean(w.body.trim());
  }
}

/** Stories, briefs and editor's notes pair side by side; the rest span the row. */
const PAIRS = new Set<WeeklyWidget["type"]>(["story", "brief", "editorsNote"]);

function halfWidths(widgets: WeeklyWidget[]): boolean[] {
  const half = widgets.map(() => false);
  for (let i = 0; i < widgets.length; ) {
    if (!PAIRS.has(widgets[i].type)) {
      i++;
      continue;
    }
    let end = i;
    while (end < widgets.length && PAIRS.has(widgets[end].type)) end++;
    const paired = end - i - ((end - i) % 2);
    for (let k = i; k < i + paired; k++) half[k] = true;
    i = end;
  }
  return half;
}

function Kicker({ children }: { children?: string }) {
  if (!children?.trim()) return null;
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
      {children}
    </p>
  );
}

function Widget({
  widget: w,
  preview,
  half,
}: {
  widget: WeeklyWidget;
  preview: boolean;
  half: boolean;
}) {
  const measure = half ? "" : "mx-auto max-w-3xl";
  switch (w.type) {
    case "story":
      return (
        <article className={`border-t border-rule pt-3 ${measure}`}>
          <Kicker>{w.kicker}</Kicker>
          <h3 className="mt-1 font-serif text-2xl font-bold leading-tight">
            {w.headline || (preview ? "Story headline" : "")}
          </h3>
          {w.byline?.trim() ? (
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              By {w.byline}
            </p>
          ) : null}
          {hasText(w.doc) ? (
            <div className="mt-3 text-[15px] leading-relaxed">
              <RichText doc={w.doc} />
            </div>
          ) : preview ? (
            <p className="mt-3 text-sm text-ink-soft">Write the story in the inspector.</p>
          ) : null}
        </article>
      );
    case "editorsNote":
      return (
        <aside className={`border-t border-rule pt-3 ${measure}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            {w.byline?.trim() || "Editor’s note"}
          </p>
          {hasText(w.doc) ? (
            <div className="mt-2 font-serif text-base italic leading-relaxed">
              <RichText doc={w.doc} />
            </div>
          ) : preview ? (
            <p className="mt-2 text-sm text-ink-soft">Write the note in the inspector.</p>
          ) : null}
        </aside>
      );
    case "scores":
      return (
        <ScoresBlock
          title={w.title}
          sport={w.sport}
          rows={w.rows}
          footnote={w.footnote}
          sourceUrl={w.sourceUrl}
          preview={preview}
        />
      );
    case "brief": {
      const href = safeHref(w.linkUrl);
      return (
        <section className="border-t border-rule pt-3">
          <Kicker>{w.kicker}</Kicker>
          <h3 className="mt-1 font-serif text-xl font-bold leading-tight">
            {w.title || (preview ? "Short section title" : "")}
          </h3>
          {hasText(w.doc) ? (
            <div className="mt-2 text-[15px] leading-relaxed">
              <RichText doc={w.doc} />
            </div>
          ) : null}
          {href && !preview ? (
            <Link
              href={href}
              {...(isExternalHref(href)
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="mt-2 inline-block text-sm font-semibold text-accent underline underline-offset-2"
            >
              {w.linkLabel || "Read more"} →
            </Link>
          ) : null}
        </section>
      );
    }
    case "text":
      return (
        <div className={`border-t border-rule pt-4 text-base leading-relaxed ${measure}`}>
          {hasText(w.doc) ? (
            <RichText doc={w.doc} />
          ) : (
            <p className="text-sm text-ink-soft">Empty text</p>
          )}
        </div>
      );
    case "note":
      return (
        <p className="mx-auto max-w-3xl border-t border-rule pt-3 text-center font-serif text-sm italic leading-relaxed text-ink-soft">
          {w.body || (preview ? "Add a note" : "")}
        </p>
      );
  }
}

/**
 * The editor-configurable part of an issue: titled sections of widgets under
 * the fixed front page. Nothing here is sized by the editor.
 */
export function WeeklySections({
  sections,
  preview = false,
  wrapSection,
  wrapWidget,
  sectionFooter,
  footer,
}: {
  sections: WeeklySection[];
  /** Draft preview and editor canvas: empty widgets show a placeholder. */
  preview?: boolean;
  /** Editor only: makes a section selectable. */
  wrapSection?: (section: WeeklySection, node: ReactNode) => ReactNode;
  /** Editor only: makes a widget selectable. */
  wrapWidget?: (widget: WeeklyWidget, node: ReactNode) => ReactNode;
  /** Editor only: controls at the end of each section ("add widget"). */
  sectionFooter?: (section: WeeklySection) => ReactNode;
  /** Editor only: the "add section" control. */
  footer?: ReactNode;
}) {
  const shown = sections
    .map((s) => ({
      section: s,
      widgets: preview ? s.widgets : s.widgets.filter(widgetHasContent),
    }))
    .filter(({ widgets }) => preview || widgets.length > 0);
  if (shown.length === 0 && !footer) return null;

  return (
    <div className="mt-8 space-y-10">
      {shown.map(({ section, widgets }) => {
        const half = halfWidths(widgets);
        const title = section.title?.trim();
        const body = (
          <section aria-label={title || undefined}>
            {title ? (
              <h2 className="border-t-2 border-ink pt-2 font-serif text-sm font-bold uppercase tracking-[0.16em]">
                {title}
              </h2>
            ) : preview ? (
              <p className="border-t-2 border-dashed border-rule-dark pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Untitled section
              </p>
            ) : (
              <div className="border-t-2 border-ink" />
            )}
            <div className="mt-4 grid gap-x-8 gap-y-8 @3xl:grid-cols-2">
              {widgets.map((w, i) => {
                const node = <Widget widget={w} preview={preview} half={half[i]} />;
                return (
                  <div
                    key={w.id}
                    className={`min-w-0 ${half[i] ? "" : "@3xl:col-span-2"}`}
                  >
                    {wrapWidget ? wrapWidget(w, node) : node}
                  </div>
                );
              })}
              {sectionFooter ? (
                <div className="@3xl:col-span-2">{sectionFooter(section)}</div>
              ) : null}
            </div>
          </section>
        );
        return (
          <div key={section.id}>
            {wrapSection ? wrapSection(section, body) : body}
          </div>
        );
      })}
      {footer}
    </div>
  );
}
