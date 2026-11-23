import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { CompactStory } from "@/components/stories";
import type { ArticleWithMeta } from "@/lib/types";

export const metadata: Metadata = { title: "Saved stories" };

export default async function SavedStoriesPage() {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login?next=/account/saved");

  const supabase = await createClient();
  const { data: saves } = await supabase
    .from("article_saves")
    .select(
      "created_at, articles(*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username), article_series(id, slug, title))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const stories = (
    (saves ?? []) as unknown as Array<{ articles: ArticleWithMeta | null }>
  )
    .map((row) => row.articles)
    .filter((a): a is ArticleWithMeta => !!a && a.status === "published");

  return (
    <div className="mx-auto max-w-3xl py-8">
      <header className="border-b-2 border-ink pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <Link href="/account" className="hover:text-ink">
            Library
          </Link>{" "}
          / Saved
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold">Saved stories</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Stories you bookmarked while signed in.
        </p>
      </header>

      {stories.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">
          Nothing saved yet. Open a story and tap Save.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-rule">
          {stories.map((a) => (
            <div key={a.id} className="py-4">
              <CompactStory article={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
