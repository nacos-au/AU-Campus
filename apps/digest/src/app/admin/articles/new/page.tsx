import { requireRole, hasRole } from "@/lib/auth";
import { ArticleForm } from "../ArticleForm";

export default async function NewArticlePage() {
  const { profile } = await requireRole("writer");
  return (
    <ArticleForm
      article={null}
      userId={profile.id}
      isStaff={hasRole(profile, "editor")}
    />
  );
}
