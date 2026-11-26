import Link from "next/link";
import { RichText } from "@/components/RichText";
import { ScoresBlock } from "@/components/weekly/ScoresBlock";
import { isExternalHref, safeHref } from "@/lib/safe-link";
import type { RichDoc, WeeklySection } from "@/lib/weekly-layout";

function hasText(doc?: RichDoc): boolean {
  const walk = (nodes?: RichDoc["content"]): boolean =>
    (nodes ?? []).some((n) => Boolean(n.text?.trim()) || walk(n.content));
  return walk(doc?.content);
}

function Brief({
  section,
  preview,
}: {
  section: Extract<WeeklySection, { type: "brief" }>;
  preview: boolean;
}) {
  const href = safeHref(section.linkUrl);
  return (
    <section className="border-t-2 border-ink pt-3">
      {section.kicker ? (
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
          {section.kicker}
        </p>
      ) : null}
      <h2 className="mt-1 font-serif text-xl font-bold leading-tight">
        {section.title || (preview ? "Short section title" : "")}
      </h2>
      {section.doc && hasText(section.doc) ? (
        <div className="mt-2 text-[15px] leading-relaxed">
          <RichText doc={section.doc} />
        </div>
      ) : null}
      {href && !preview ? (
        <Link
          href={href}
          {...(isExternalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="mt-2 inline-block text-sm font-semibold text-accent underline underline-offset-2"
        >
          {section.linkLabel || "Read more"} →
        </Link>
      ) : null}
    </section>
  );
}

/**
 * The editor-configurable part of an issue. Sections flow in order: scores,
 * text and notes take the full width; briefs pair up side by side when there
 * is room. Nothing here is sized by the editor.
 */
export function WeeklySections({
  sections,
  preview = false,
}: {
  sections: WeeklySection[];
  /** Draft preview and editor canvas: empty sections show a placeholder. */
  preview?: boolean;
}) {
  const visible = sections.filter((s) => {
    if (preview) return true;
    switch (s.type) {
      case "text":
        return hasText(s.doc);
      case "brief":
        return Boolean(s.title.trim()) || hasText(s.doc);
      case "scores":
        return s.rows.some((r) => r.home || r.away);
      case "note":
        return Boolean(s.body.trim());
    }
  });
  if (visible.length === 0) return null;

  // Consecutive briefs pair up side by side; an odd one out stays full width.
  const halfWidth: boolean[] = visible.map(() => false);
  for (let i = 0; i < visible.length; ) {
    if (visible[i].type !== "brief") {
      i++;
      continue;
    }
    let end = i;
    while (end < visible.length && visible[end].type === "brief") end++;
    const paired = end - i - ((end - i) % 2);
    for (let k = i; k < i + paired; k++) halfWidth[k] = true;
    i = end;
  }

  return (
    <div className="mt-8 grid gap-x-8 gap-y-8 @3xl:grid-cols-2">
      {visible.map((s, i) => {
        const half = halfWidth[i];
        return (
          <div key={s.id} className={`min-w-0 ${half ? "" : "@3xl:col-span-2"}`}>
            {s.type === "text" ? (
              <div className="mx-auto max-w-3xl border-t border-rule pt-4 text-base leading-relaxed">
                {hasText(s.doc) ? (
                  <RichText doc={s.doc} />
                ) : (
                  <p className="text-sm text-ink-soft">Empty text section</p>
                )}
              </div>
            ) : null}
            {s.type === "brief" ? <Brief section={s} preview={preview} /> : null}
            {s.type === "scores" ? (
              <ScoresBlock
                title={s.title}
                sport={s.sport}
                rows={s.rows}
                footnote={s.footnote}
                sourceUrl={s.sourceUrl}
                preview={preview}
              />
            ) : null}
            {s.type === "note" ? (
              <p className="mx-auto max-w-3xl border-t border-rule pt-3 text-center font-serif text-sm italic leading-relaxed text-ink-soft">
                {s.body || (preview ? "Add a note" : "")}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
