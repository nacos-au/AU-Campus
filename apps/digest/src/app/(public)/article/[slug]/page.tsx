import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/AdSlot";
import { RichText } from "@/components/RichText";
import { LikeShare } from "@/components/LikeShare";
import { displayByline } from "@/lib/byline";
import { CompactStory } from "@/components/stories";
import { readingMinutes } from "@/lib/articles";
import { digestFeatures } from "@/lib/features";
import type { ArticleWithMeta } from "@/lib/types";

export const revalidate = 60;

const SELECT =
  "*, sections(slug, name), profiles!articles_author_id_fkey(display_name, username)";

async function getArticle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as unknown as ArticleWithMeta | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.dek ?? undefined,
    openGraph: {
      title: article.title,
      description: article.dek ?? undefined,
      images: article.cover_url ? [article.cover_url] : undefined,
      type: "article",
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, locale] = await Promise.all([getArticle(slug), getLocale()]);
  if (!article) notFound();

  const supabase = await createClient();
  const { data: relatedData } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("status", "published")
    .eq("section_id", article.section_id)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(4);
  const related = (relatedData ?? []) as unknown as ArticleWithMeta[];

  const published = article.published_at
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(article.published_at))
    : "";

  return (
    <div className="py-8">
      <article className="mx-auto max-w-3xl">
        {article.sections && (
          <Link
            href={`/section/${article.sections.slug}`}
            className="text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
          >
            {article.sections.name}
          </Link>
        )}

        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-5xl sm:leading-tight">
          {article.title}
        </h1>

        {article.dek && (
          <p className="mt-4 font-serif text-xl leading-snug text-ink-soft">
            {article.dek}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-rule py-3 text-xs text-ink-soft">
          {displayByline(article) && (
            <span>
              By{" "}
              {article.byline_mode && article.byline_mode !== "personal" ? (
                <span className="font-semibold text-ink">{displayByline(article)}</span>
              ) : article.profiles?.username ? (
                <Link
                  href={`/author/${article.profiles.username}`}
                  className="font-semibold text-ink hover:text-accent"
                >
                  {displayByline(article)}
                </Link>
              ) : (
                <span className="font-semibold text-ink">{displayByline(article)}</span>
              )}
            </span>
          )}
          <span>{published}</span>
          {article.content_updated_at &&
            article.published_at &&
            new Date(article.content_updated_at).getTime() >
              new Date(article.published_at).getTime() + 60_000 && (
              <span>
                Updated{" "}
                {new Intl.DateTimeFormat(locale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(article.content_updated_at))}
              </span>
            )}
          <span>{readingMinutes(article.body)} min read</span>
        </div>

        {article.cover_url && (
          <figure className="mt-6">
            <div className="relative aspect-video w-full overflow-hidden bg-rule">
              <Image
                src={article.cover_url}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          </figure>
        )}

        <div className="mt-8">
          <RichText doc={article.body} />
        </div>

        {digestFeatures.publicLikes && (
          <LikeShare
            articleId={article.id}
            initialLikes={article.like_count ?? 0}
            title={article.title}
          />
        )}
      </article>

      <div className="mx-auto max-w-3xl">
        <AdSlot slot="infeed" className="mt-12 border-t border-rule pt-8" />
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-14 max-w-3xl border-t-2 border-ink pt-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">
            More in {article.sections?.name}
          </h2>
          <div className="divide-y divide-rule">
            {related.map((a) => (
              <div key={a.id} className="py-4">
                <CompactStory article={a} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
