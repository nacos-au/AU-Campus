import { notFound } from "next/navigation";
import { requireRole, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Article, RevisionPayload } from "@/lib/types";
import { ArticleComposer } from "../../ArticleComposer";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireRole("writer");
  const { id } = await params;
  const isStaff = hasRole(profile, "editor");

  const supabase = await createClient();
  // RLS scopes this: writers only see their own, staff see everything.
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single<Article>();
  if (!article) notFound();

  const { data: rev } = await supabase
    .from("article_revisions")
    .select("payload, state")
    .eq("article_id", id)
    .maybeSingle<{ payload: RevisionPayload; state: string }>();

  const withEditor =
    article.status === "awaiting_editor" || rev?.state === "awaiting_editor";
  const locked =
    withEditor && article.author_id === profile.id && !isStaff;

  return (
    <ArticleComposer
      article={article}
      revision={article.status === "published" ? (rev?.payload ?? null) : null}
      userId={profile.id}
      isStaff={isStaff}
      locked={locked}
    />
  );
}
