import { requireRole, hasRole } from "@/lib/auth";
import { ArticlesTable } from "./ArticlesTable";

export default async function AdminArticlesPage() {
  const { profile } = await requireRole("writer");
  return (
    <ArticlesTable
      isStaff={hasRole(profile, "editor")}
      isAdmin={hasRole(profile, "admin")}
      userId={profile.id}
    />
  );
}
