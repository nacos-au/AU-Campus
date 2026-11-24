import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CompactStory } from "@/components/stories";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import { site } from "@/lib/site";
import type { ArticleSeries, ArticleWithMeta, Profile } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("username", username)
    .maybeSingle();
  const name = (data as { display_name?: string } | null)?.display_name;
  return {
    title: name ? `${name} · Contributor` : `@${username}`,
    description: name
      ? `Stories by ${name} in ${site.name}.`
      : undefined,
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio, role")
    .eq("username", username)
    .maybeSingle<Pick<Profile, "id" | "display_name" | "username" | "bio" | "role">>();

  if (!profile) notFound();

  const [{ data: owned }, { data: collabIds }, { data: seriesRows }] =
    await Promise.all([
      supabase
        .from("articles")
        .select(ARTICLE_PUBLIC_SELECT)
        .eq("author_id", profile.id)
        .eq("status", "published")
        .order("published_at", { ascending: false }),
      supabase
        .from("article_collaborators")
        .select("article_id")
        .eq("user_id", profile.id),
      supabase
        .from("articles")
        .select("series_id, article_series(id, slug, title)")
        .eq("author_id", profile.id)
        .eq("status", "published")
        .not("series_id", "is", null),
    ]);

  const byId = new Map<string, ArticleWithMeta>();
  for (const a of (owned ?? []) as unknown as ArticleWithMeta[]) {
    byId.set(a.id, a);
  }
  const missingIds = (collabIds ?? [])
    .map((r) => (r as { article_id: string }).article_id)
    .filter((id) => !byId.has(id));
  if (missingIds.length > 0) {
    const { data: collabArticles } = await supabase
      .from("articles")
      .select(ARTICLE_PUBLIC_SELECT)
      .in("id", missingIds)
      .eq("status", "published");
    for (const a of (collabArticles ?? []) as unknown as ArticleWithMeta[]) {
      byId.set(a.id, a);
    }
  }
  const articles = [...byId.values()].sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    return tb - ta;
  });

  const seriesMap = new Map<string, Pick<ArticleSeries, "id" | "slug" | "title">>();
  const addSeries = (
    raw:
      | Pick<ArticleSeries, "id" | "slug" | "title">
      | Pick<ArticleSeries, "id" | "slug" | "title">[]
      | null
      | undefined
  ) => {
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const s of list) {
      if (s?.id) seriesMap.set(s.id, s);
    }
  };
  for (const row of (seriesRows ?? []) as unknown as Array<{
    article_series?:
      | Pick<ArticleSeries, "id" | "slug" | "title">
      | Pick<ArticleSeries, "id" | "slug" | "title">[]
      | null;
  }>) {
    addSeries(row.article_series);
  }
  for (const a of articles) {
    addSeries(a.article_series);
  }
  const seriesList = [...seriesMap.values()].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  const totalLikes = articles.reduce((s, a) => s + (a.like_count ?? 0), 0);
  const totalSaves = articles.reduce((s, a) => s + (a.save_count ?? 0), 0);
  const articleLabel =
    articles.length === 1 ? "1 article" : `${articles.length} articles`;
  const likeLabel =
    totalLikes === 1 ? "1 like" : `${totalLikes} likes`;
  const saveLabel =
    totalSaves === 1 ? "1 save" : `${totalSaves} saves`;

  return (
    <div className="mx-auto max-w-3xl py-10 sm:py-14">
      <header className="border-b border-ink pb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          Contributor · {site.name}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          {profile.display_name}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">@{profile.username}</p>
        {profile.bio && (
          <p className="mt-5 max-w-xl font-serif text-lg leading-snug text-ink-soft">
            {profile.bio}
          </p>
        )}
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
          {articleLabel}
          <span className="mx-2 text-ink-soft">·</span>
          {likeLabel}
          <span className="mx-2 text-ink-soft">·</span>
          {saveLabel}
        </p>
        {seriesList.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule pt-5">
            {seriesList.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/series/${s.slug}`}
                  className="text-[11px] font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      <section className="mt-2">
        <h2 className="sr-only">Published stories</h2>
        {articles.length === 0 ? (
          <p className="py-14 text-sm text-ink-soft">No published articles yet.</p>
        ) : (
          <div className="divide-y divide-rule">
            {articles.map((article) => (
              <div key={article.id} className="py-5">
                <CompactStory article={article} showEngagement />
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 border-t border-rule pt-6 text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Back to the front page
        </Link>
      </p>
    </div>
  );
}
