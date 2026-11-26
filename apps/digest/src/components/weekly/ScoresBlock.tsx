import Link from "next/link";
import type { ScoreRow } from "@/lib/weekly-layout";
import { isExternalHref, safeHref } from "@/lib/safe-link";

/** Compact results table. Used for matchweek scores in any sport. */
export function ScoresBlock({
  title,
  sport,
  rows,
  footnote,
  sourceUrl,
  preview,
}: {
  title: string;
  sport?: string;
  rows: ScoreRow[];
  footnote?: string;
  sourceUrl?: string;
  preview?: boolean;
}) {
  const source = safeHref(sourceUrl);
  const visible = rows.filter((r) => r.home || r.away);
  // Readers never see an empty results box.
  if (visible.length === 0 && !preview) return null;

  return (
    <section className="border-t-2 border-ink pt-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
        <h2 className="font-serif text-lg font-bold leading-tight md:text-xl">
          {title || (preview ? "Matchweek" : "")}
        </h2>
        {sport ? (
          <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent">
            {sport}
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="py-3 text-sm text-ink-soft">
          {preview ? "Add a fixture row in the inspector." : ""}
        </p>
      ) : (
        <table className="mt-1 w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-16" />
            <col />
            <col className="w-20" />
          </colgroup>
          <tbody className="divide-y divide-rule">
            {visible.map((r) => (
              <tr key={r.id} className="align-middle">
                <td className="py-2 pr-2 text-right font-semibold leading-snug">{r.home}</td>
                <td className="py-2 text-center font-serif text-base font-bold tabular-nums">
                  {r.homeScore || "–"}
                  <span className="mx-1 text-ink-soft">–</span>
                  {r.awayScore || "–"}
                </td>
                <td className="py-2 pl-2 font-semibold leading-snug">{r.away}</td>
                <td className="py-2 text-right text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  {r.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {footnote?.trim() || (source && !preview) ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          {footnote?.trim()}
          {source && !preview ? (
            <>
              {footnote?.trim() ? " " : null}
              <Link
                href={source}
                {...(isExternalHref(source)
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="font-semibold underline underline-offset-2 hover:text-ink"
              >
                Full results
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
