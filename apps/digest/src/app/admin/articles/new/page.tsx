import { requireRole, hasRole } from "@/lib/auth";
import { ArticleComposer } from "../ArticleComposer";

export default async function NewArticlePage() {
  const { profile } = await requireRole("writer");
  return (
    <ArticleComposer
      article={null}
      userId={profile.id}
      isStaff={hasRole(profile, "editor")}
    />
  );
}
