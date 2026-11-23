import type { Article, ArticleSeries, BylineMode, Profile } from "@/lib/types";

/** Public credit line — never exposes account internals. */
export function displayByline(
  article: Pick<Article, "byline" | "byline_mode"> & {
    profiles?: Pick<Profile, "display_name"> | null;
  }
): string | null {
  const mode: BylineMode =
    article.byline_mode === "alias" ? "alias" : "personal";
  if (mode === "alias") {
    return article.byline?.trim() || article.profiles?.display_name || null;
  }
  return article.profiles?.display_name || article.byline?.trim() || null;
}

export function seriesHref(
  series: Pick<ArticleSeries, "slug"> | null | undefined
): string | null {
  if (!series?.slug) return null;
  return `/series/${series.slug}`;
}
