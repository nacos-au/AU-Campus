import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CompactStory, StoryCard } from "@/components/stories";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import type { ArticleWithMeta } from "@/lib/types";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim();
  const supabase = await createClient();

  let articles: ArticleWithMeta[] = [];
  if (q) {
    // Demo client has no `.ilike` — fall back to client-side filter on a fetch.
    const { data } = await supabase
      .from("articles")
      .select(ARTICLE_PUBLIC_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(60);

    const all = (data ?? []) as unknown as ArticleWithMeta[];
    const needle = q.toLowerCase();
    articles = all.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        (a.dek ?? "").toLowerCase().includes(needle)
    );
  }

  return (
    <div className="py-6 md:py-8">
      <header className="border-b-2 border-ink pb-4">
        <h1 className="font-serif text-3xl font-bold md:text-4xl">Search</h1>
        <form action="/search" className="mt-4 flex gap-2 max-w-xl">
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Search headlines…"
            className="min-w-0 flex-1 border border-rule-dark px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            className="bg-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-paper"
          >
            Go
          </button>
        </form>
      </header>

      {!q ? (
        <p className="py-12 text-center text-sm text-ink-soft">
          Type a keyword to find stories across the paper.
        </p>
      ) : articles.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-soft">
          No stories matched “{q}”.
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs uppercase tracking-wider text-ink-soft">
            {articles.length} result{articles.length === 1 ? "" : "s"} for “{q}”
          </p>
          <div className="mt-6 hidden gap-8 md:grid md:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <StoryCard key={a.id} article={a} />
            ))}
          </div>
          <div className="mt-4 divide-y divide-rule md:hidden">
            {articles.map((a) => (
              <div key={a.id} className="py-4">
                <CompactStory article={a} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
