import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, hasRole } from "@/lib/auth";
import { isPublicSectionSlug } from "@/lib/features";
import { createAuthClient } from "@/lib/supabase/auth-client";
import type { Article, ReviewComment, RevisionPayload, Section } from "@/lib/types";
import { VersionHistory } from "@/app/admin/articles/VersionHistory";
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
  const assignedEditorIsMe = assignee === profile.id;
  const canReview =
    state === "awaiting_editor" &&
    assignedEditorIsMe &&
    (hasRole(profile, "editor") || Boolean(profile.is_super_admin));
  const canMakeLive =
    !isRevision &&
    article.status === "scheduled" &&
    hasRole(profile, "editor");
  const canMoveDesk = hasRole(profile, "editor");
  const isSuperAdmin = Boolean(profile.is_super_admin);
  const adminModeOn = Boolean(profile.elevated);

  const { data: sectionRows } = await supabase
    .from("sections")
    .select("id, slug, name, position")
    .order("position");
  const sections = ((sectionRows ?? []) as Section[]).filter((s) =>
    isPublicSectionSlug(s.slug)
  );
  const sectionId =
    typeof content.section_id === "number" && content.section_id
      ? content.section_id
      : article.section_id;

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
        canMakeLive={canMakeLive}
        canMoveDesk={canMoveDesk}
        sectionId={sectionId}
        sections={sections}
        isAuthor={isAuthor}
        assignedEditorIsMe={assignedEditorIsMe}
        userId={profile.id}
        isSuperAdmin={isSuperAdmin}
        adminModeOn={adminModeOn}
        initialComments={(comments ?? []) as unknown as ReviewComment[]}
      />

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Version history
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Seamless with the review thread above — snapshots of what went live and
          what changed. Writers and editors both see this trail.
        </p>
        <div className="mt-4">
          <VersionHistory articleId={id} />
        </div>
      </section>
    </div>
  );
}
