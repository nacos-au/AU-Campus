import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { ArticleView } from "@/components/ArticleView";
import { createClient } from "@/lib/supabase/server";
import { ARTICLE_PUBLIC_SELECT, articlePublicPath } from "@/lib/articles";
import { socialMetadata } from "@/lib/og";
import type { ArticleWithMeta } from "@/lib/types";

export const revalidate = 60;

async function getArticle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
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
    alternates: {
      canonical: article.short_code
        ? articlePublicPath(article)
        : `/article/${article.slug}`,
    },
    ...socialMetadata({
      title: article.title,
      description: article.dek,
      image: article.cover_url,
      brandSubtitle: article.title,
      type: "article",
    }),
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

  if (article.short_code?.trim()) {
    permanentRedirect(articlePublicPath(article));
  }

  const supabase = await createClient();
  const { data: relatedData } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
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
    <ArticleView
      article={article}
      related={related}
      published={published}
      locale={locale}
    />
  );
}
