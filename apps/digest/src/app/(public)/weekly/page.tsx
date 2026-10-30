import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Byline, CompactStory } from "@/components/stories";
import { excerpt } from "@/lib/articles";
import { site } from "@/lib/site";
import type { ArticleWithMeta, Edition, Section } from "@/lib/types";

export const metadata: Metadata = { title: "Weekly Issue" };
export const revalidate = 300;

const SELECT =
  "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username)";

function dek(a: ArticleWithMeta, chars = 180) {
  return a.dek || excerpt(a.body, chars);
}

function Thumb({ a, className = "" }: { a: ArticleWithMeta; className?: string }) {
  if (!a.cover_url) return null;
  return (
    <div className={`relative shrink-0 overflow-hidden bg-rule ${className}`}>
      <Image src={a.cover_url} alt="" fill sizes="200px" className="object-cover" />
    </div>
  );
}

export default async function WeeklyIssuePage() {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);

  const [{ data: articlesData }, { data: sectionsData }, { data: editionData }] =
    await Promise.all([
      supabase
        .from("articles")
        .select(SELECT)
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(40),
      supabase.from("sections").select("*").order("position"),
      supabase
        .from("editions")
        .select("*")
        .eq("published", true)
        .order("issue_date", { ascending: false })
        .limit(1),
    ]);

  const all = (articlesData ?? []) as unknown as ArticleWithMeta[];
  const sections = (sectionsData ?? []) as Section[];
  const edition = ((editionData ?? []) as Edition[])[0] ?? null;

  // This week's stories; fall back to the latest if the week is quiet.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = all.filter(
    (a) => a.published_at && new Date(a.published_at).getTime() >= weekAgo
  );
  const pool = recent.length >= 6 ? recent : all;

  const [lead, second, ...rest] = pool;
  const rail = rest.slice(0, 4);
  const remaining = rest.slice(4);

  const issueDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const bySection = sections
    .map((s) => ({
      section: s,
      stories: remaining.filter((a) => a.section_id === s.id).slice(0, 4),
    }))
    .filter((g) => g.stories.length > 0);

  return (
    <div className="py-6 md:py-10">
      {/* Masthead */}
      <header className="flex flex-col gap-4 border-b-2 border-ink pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-4xl font-black tracking-tight md:text-6xl">
            This Week’s Issue
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {site.name} in print for{" "}
            <span className="font-semibold text-ink">{issueDate}</span>
          </p>
        </div>
        <Link
          href="/editions"
          className="inline-flex w-fit items-center gap-2 bg-accent px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-hover"
        >
          {edition ? `Buy the print edition` : "Print editions"}
        </Link>
      </header>

      {!lead ? (
        <p className="py-20 text-center text-ink-soft">
          This week’s issue is being put together. Check back soon.
        </p>
      ) : (
        <>
          <h2 className="mt-8 font-serif text-2xl font-bold">The Front Page</h2>

          {/* Front page: lead · second · rail */}
          <div className="mt-4 grid gap-8 border-b border-rule pb-10 lg:grid-cols-[1.6fr_1fr_1fr]">
            <article className="lg:border-r lg:border-rule lg:pr-8">
              <Link href={`/article/${lead.slug}`} className="headline-link group block">
                {lead.cover_url && (
                  <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden bg-rule">
                    <Image
                      src={lead.cover_url}
                      alt={lead.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}
                {lead.sections && (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    {lead.sections.name}
                  </p>
                )}
                <h3 className="mt-1 font-serif text-3xl font-bold leading-tight group-hover:text-accent md:text-4xl">
                  {lead.title}
                </h3>
                <p className="mt-3 font-serif text-lg leading-snug text-ink-soft">
                  {dek(lead, 240)}
                </p>
              </Link>
              <Byline article={lead} className="mt-3" />
            </article>

            {second && (
              <article className="lg:border-r lg:border-rule lg:pr-8">
                <Link href={`/article/${second.slug}`} className="headline-link group block">
                  {second.cover_url && (
                    <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden bg-rule">
                      <Image
                        src={second.cover_url}
                        alt={second.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  {second.sections && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                      {second.sections.name}
                    </p>
                  )}
                  <h3 className="mt-1 font-serif text-2xl font-bold leading-tight group-hover:text-accent">
                    {second.title}
                  </h3>
                  <p className="mt-2 font-serif leading-snug text-ink-soft">
                    {dek(second)}
                  </p>
                </Link>
                <Byline article={second} className="mt-3" />
              </article>
            )}

            <div className="divide-y divide-rule">
              {rail.map((a) => (
                <article key={a.id} className="py-4 first:pt-0">
                  <Link href={`/article/${a.slug}`} className="headline-link group flex gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-accent">
                        {a.title}
                      </h3>
                      <p className="mt-1 line-clamp-3 font-serif text-sm leading-snug text-ink-soft">
                        {dek(a, 120)}
                      </p>
                    </div>
                    <Thumb a={a} className="h-16 w-20" />
                  </Link>
                  <Byline article={a} className="mt-1.5" />
                </article>
              ))}
            </div>
          </div>

          {/* Inside pages, by section */}
          {bySection.map(({ section, stories }) => (
            <section key={section.id} className="border-b border-rule py-8">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-2xl font-bold">{section.name}</h2>
                <Link
                  href={`/section/${section.slug}`}
                  className="text-[11px] font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
                >
                  All {section.name} →
                </Link>
              </div>
              <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                {stories.map((a) => (
                  <article key={a.id}>
                    <Link href={`/article/${a.slug}`} className="headline-link group block">
                      {a.cover_url && (
                        <div className="relative mb-3 aspect-[3/2] w-full overflow-hidden bg-rule">
                          <Image
                            src={a.cover_url}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, 25vw"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-accent">
                        {a.title}
                      </h3>
                      <p className="mt-1 line-clamp-3 font-serif text-sm leading-snug text-ink-soft">
                        {dek(a, 120)}
                      </p>
                    </Link>
                    <Byline article={a} className="mt-1.5" />
                  </article>
                ))}
              </div>
            </section>
          ))}

          {remaining.length > 0 && bySection.length === 0 && (
            <section className="py-8">
              <h2 className="font-serif text-2xl font-bold">Also in this issue</h2>
              <div className="mt-4 divide-y divide-rule">
                {remaining.map((a) => (
                  <div key={a.id} className="py-4">
                    <CompactStory article={a} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Print CTA */}
          {edition && (
            <aside className="mt-10 flex flex-col gap-5 border border-rule-dark p-6 sm:flex-row sm:items-center">
              {edition.cover_url && (
                <div className="relative aspect-[8/11] w-28 shrink-0 overflow-hidden border border-rule-dark bg-rule">
                  <Image src={edition.cover_url} alt={edition.title} fill sizes="112px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                  The print edition
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold">{edition.title}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  The full issue as a watermarked PDF, read in your browser.
                </p>
              </div>
              <Link
                href="/editions"
                className="shrink-0 bg-accent px-5 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-hover"
              >
                Buy this issue
              </Link>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
