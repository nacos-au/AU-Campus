import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { ArticleView } from "@/components/ArticleView";
import { createClient } from "@/lib/supabase/server";
import {
  ARTICLE_PUBLIC_SELECT,
  articlePublicPath,
  articleTitleStem,
} from "@/lib/articles";
import { socialMetadata } from "@/lib/og";
import type { ArticleWithMeta } from "@/lib/types";

export const revalidate = 60;

async function getByCode(code: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_PUBLIC_SELECT)
    .eq("short_code", code.toLowerCase())
    .eq("status", "published")
    .maybeSingle();
  return data as unknown as ArticleWithMeta | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; stem?: string[] }>;
}): Promise<Metadata> {
  const { code } = await params;
  const article = await getByCode(code);
  if (!article) return {};
  return {
    title: article.title,
    description: article.dek ?? undefined,
    alternates: { canonical: articlePublicPath(article) },
    ...socialMetadata({
      title: article.title,
      description: article.dek,
      image: article.cover_url,
      brandSubtitle: article.title,
      type: "article",
    }),
  };
}

export default async function ShortArticlePage({
  params,
}: {
  params: Promise<{ code: string; stem?: string[] }>;
}) {
  const { code, stem } = await params;
  const [article, locale] = await Promise.all([getByCode(code), getLocale()]);
  if (!article) notFound();

  const wantStem = articleTitleStem(article.title);
  const gotStem = (stem?.[0] ?? "").replace(/\/$/, "");
  if (gotStem !== wantStem) {
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
