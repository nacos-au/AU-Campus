import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/AdSlot";
import { StoryCard } from "@/components/stories";
import { ARTICLE_PUBLIC_SELECT } from "@/lib/articles";
import { isPublicSectionSlug } from "@/lib/features";
import type { ArticleWithMeta, Section } from "@/lib/types";

export const revalidate = 60;

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: section } = await supabase
    .from("sections")
    .select("*")
    .eq("slug", slug)
    .single<Section>();

  if (!section || !isPublicSectionSlug(section.slug)) notFound();

  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
    .eq("status", "published")
    .eq("section_id", section.id)
    .order("published_at", { ascending: false })
    .limit(30);

  const articles = (data ?? []) as unknown as ArticleWithMeta[];

  return (
    <div className="py-8">
      <header className="border-b-2 border-ink pb-4">
        <h1 className="font-serif text-4xl font-bold">{section.name}</h1>
      </header>

      {articles.length === 0 ? (
        <p className="py-16 text-center text-ink-soft">
          No stories in this section yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => (
              <div key={a.id}>
                <StoryCard article={a} />
                {/* in-feed ad after the sixth story */}
                {i === 5 && <AdSlot slot="infeed" className="mt-10" />}
              </div>
            ))}
          </div>
          <AdSlot slot="leaderboard" className="mt-14 border-t border-rule pt-8" />
        </>
      )}
    </div>
  );
}
