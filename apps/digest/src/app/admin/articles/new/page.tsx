import { requireRole, hasRole } from "@/lib/auth";
import { ArticleForm } from "../ArticleForm";

export default async function NewArticlePage() {
  const { profile } = await requireRole("writer");
  return <ArticleForm article={null} isStaff={hasRole(profile, "editor")} />;
}
