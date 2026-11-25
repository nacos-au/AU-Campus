import type {
  Article,
  ArticleCollaborator,
  ArticleSeries,
  BylineMode,
  DeskCredit,
  Profile,
  Role,
} from "@/lib/types";
import { site } from "@/lib/site";

export type CreditPerson = Pick<Profile, "display_name" | "username"> &
  Partial<Pick<Profile, "avatar_url" | "desk_credit" | "role" | "base_role">>;

function collaboratorPeople(
  rows: ArticleCollaborator[] | null | undefined
): CreditPerson[] {
  if (!rows?.length) return [];
  return [...rows]
    .sort((a, b) => a.credit_order - b.credit_order)
    .map((c) => c.profiles)
    .filter((p): p is CreditPerson => Boolean(p?.display_name));
}

/** Ordered credit names for personal bylines (owner first, then collaborators). */
export function creditPeople(
  article: Pick<Article, "byline" | "byline_mode"> & {
    profiles?: CreditPerson | null;
    article_collaborators?: ArticleCollaborator[] | null;
  }
): CreditPerson[] {
  const mode: BylineMode =
    article.byline_mode === "alias" ? "alias" : "personal";
  if (mode === "alias") return [];
  const owner = article.profiles?.display_name
    ? article.profiles
    : article.byline?.trim()
      ? {
          display_name: article.byline.trim(),
          username: null,
          avatar_url: null,
          desk_credit: null,
          role: "writer" as Role,
        }
      : null;
  const others = collaboratorPeople(article.article_collaborators);
  return owner ? [owner, ...others] : others;
}

/** Plain-text credit — “Ada”, “Ada and Ben”, “Ada, Ben and Chi”. */
export function displayByline(
  article: Pick<Article, "byline" | "byline_mode"> & {
    profiles?: Pick<Profile, "display_name"> | null;
    article_collaborators?: ArticleCollaborator[] | null;
  }
): string | null {
  const mode: BylineMode =
    article.byline_mode === "alias" ? "alias" : "personal";
  if (mode === "alias") {
    return article.byline?.trim() || article.profiles?.display_name || null;
  }
  const people = creditPeople(article);
  if (people.length === 0) return null;
  const names = people.map((p) => p.display_name);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Resolve public desk title. Never returns admin.
 * Null desk_credit: writer→writer, editor→editor, admin→writer.
 */
export function resolveDeskCredit(
  person:
    | Partial<Pick<Profile, "desk_credit" | "role" | "base_role">>
    | null
    | undefined
): DeskCredit {
  if (person?.desk_credit === "writer" || person?.desk_credit === "editor") {
    return person.desk_credit;
  }
  const ladder = person?.base_role ?? person?.role;
  if (ladder === "editor") return "editor";
  return "writer";
}

/** e.g. "Writer at AUSA Digest" */
export function deskCreditLine(
  person:
    | Partial<Pick<Profile, "desk_credit" | "role" | "base_role">>
    | null
    | undefined
): string {
  const desk = resolveDeskCredit(person);
  const label = desk === "editor" ? "Editor" : "Writer";
  return `${label} at ${site.name}`;
}

export function seriesHref(
  series: Pick<ArticleSeries, "slug"> | null | undefined
): string | null {
  if (!series?.slug) return null;
  return `/series/${series.slug}`;
}
