import Link from "next/link";
import { requireRole, hasRole } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-client";
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

  // Always live Supabase for the newsroom — never the demo fixture client.
  const supabase = await createAuthClient();
  // RLS scopes this: writers only see their own, staff see everything.
  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Article>();
  if (!article) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">Draft not found</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {error?.message ||
            "This draft may still be saving, or you don’t have access to it."}
        </p>
        <Link
          href="/admin/articles?filter=draft"
          className="mt-6 inline-block text-sm font-semibold text-accent underline underline-offset-2"
        >
          ← Back to drafts
        </Link>
      </div>
    );
  }

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
      isAdmin={hasRole(profile, "admin")}
      isSuperAdmin={!!profile.is_super_admin}
      locked={locked}
    />
  );
}
