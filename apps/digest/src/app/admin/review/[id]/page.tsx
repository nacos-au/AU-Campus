import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, hasRole } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-client";
import type { Article, ReviewComment, RevisionPayload } from "@/lib/types";
import { ReviewClient } from "./ReviewClient";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireRole("writer");
  const { id } = await params;
  const supabase = await createAuthClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Article>();
  if (!article) notFound();

  const { data: rev } = await supabase
    .from("article_revisions")
    .select("payload, state, assigned_editor_id")
    .eq("article_id", id)
    .maybeSingle<{
      payload: RevisionPayload;
      state: string;
      assigned_editor_id: string | null;
    }>();

  const { data: comments } = await supabase
    .from("article_review_comments")
    .select("*, profiles(display_name)")
    .eq("article_id", id)
    .order("created_at");

  const isRevision = article.status === "published" && !!rev;
  const content: RevisionPayload = isRevision
    ? rev!.payload
    : {
        title: article.title,
        dek: article.dek,
        body: article.body,
        cover_url: article.cover_url,
        byline: article.byline ?? null,
        section_id: article.section_id,
        language: article.language,
      };

  const state = isRevision ? rev!.state : article.status;
  const assignee = isRevision ? rev!.assigned_editor_id : article.assigned_editor_id;
  const isAuthor = article.author_id === profile.id;
  const soleSelf = isAuthor && hasRole(profile, "editor");
  const canReview =
    state === "awaiting_editor" &&
    hasRole(profile, "editor") &&
    assignee === profile.id &&
    (!isAuthor || soleSelf);

  return (
    <div>
      <Link href="/admin/articles" className="text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink">
        ← Articles
      </Link>
      <ReviewClient
        articleId={id}
        content={content}
        state={state}
        isRevision={isRevision}
        canReview={canReview}
        isAuthor={isAuthor}
        userId={profile.id}
        initialComments={(comments ?? []) as unknown as ReviewComment[]}
      />
    </div>
  );
}
