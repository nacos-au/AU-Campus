import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CompactStory } from "@/components/stories";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import type { ArticleSeries, ArticleWithMeta } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("article_series")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();
  return { title: data?.title ? `${data.title} · Series` : "Series" };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: series } = await supabase
    .from("article_series")
    .select("id, slug, title, description")
    .eq("slug", slug)
    .maybeSingle<Pick<ArticleSeries, "id" | "slug" | "title" | "description">>();

  if (!series) notFound();

  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
    .eq("series_id", series.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const articles = (data ?? []) as unknown as ArticleWithMeta[];

  return (
    <div className="mx-auto max-w-3xl py-8">
      <header className="border-b-2 border-ink pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Series
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold">{series.title}</h1>
        {series.description && (
          <p className="mt-4 max-w-xl font-serif text-lg leading-snug text-ink-soft">
            {series.description}
          </p>
        )}
      </header>

      {articles.length === 0 ? (
        <p className="py-12 text-sm text-ink-soft">No published pieces in this series yet.</p>
      ) : (
        <div className="divide-y divide-rule">
          {articles.map((article) => (
            <div key={article.id} className="py-4">
              <CompactStory article={article} />
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Back to the front page
        </Link>
      </p>
    </div>
  );
}
