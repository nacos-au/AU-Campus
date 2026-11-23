import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CompactStory } from "@/components/stories";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import type { ArticleSeries, ArticleWithMeta, Profile } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
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
  for (const row of seriesRows ?? []) {
    const nested = (row as { article_series?: Pick<ArticleSeries, "id" | "slug" | "title"> | null })
      .article_series;
    if (nested?.id) seriesMap.set(nested.id, nested);
  }
  const seriesList = [...seriesMap.values()].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <div className="mx-auto max-w-3xl py-8">
      <header className="border-b-2 border-ink pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Author
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold">{profile.display_name}</h1>
        <p className="mt-1 text-sm text-ink-soft">@{profile.username}</p>
        {profile.bio && (
          <p className="mt-4 max-w-xl font-serif text-lg leading-snug text-ink-soft">
            {profile.bio}
          </p>
        )}
        {seriesList.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
            {seriesList.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/series/${s.slug}`}
                  className="text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      {articles.length === 0 ? (
        <p className="py-12 text-sm text-ink-soft">No published articles yet.</p>
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
