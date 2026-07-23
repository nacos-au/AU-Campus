import { notFound } from "next/navigation";
import { requireRole, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";
import { ArticleForm } from "../../ArticleForm";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireRole("writer");
  const { id } = await params;

  const supabase = await createClient();
  // RLS scopes this: writers only see their own, staff see everything.
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single<Article>();

  if (!article) notFound();
  return (
    <ArticleForm article={article} isStaff={hasRole(profile, "editor")} />
  );
}
