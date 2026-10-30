import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CompactStory } from "@/components/stories";
import type { ArticleWithMeta, Profile } from "@/lib/types";

const ARTICLE_SELECT =
  "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username)";

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

  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("author_id", profile.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const articles = (data ?? []) as unknown as ArticleWithMeta[];

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
