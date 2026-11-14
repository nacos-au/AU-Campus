import { Suspense } from "react";
import { requireRole, hasRole } from "@/lib/auth";
import { ArticlesTable } from "./ArticlesTable";

export default async function AdminArticlesPage() {
  const { profile } = await requireRole("writer");
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-ink-soft">Loading…</p>}>
      <ArticlesTable
        isStaff={hasRole(profile, "editor")}
        isAdmin={hasRole(profile, "admin")}
        userId={profile.id}
      />
    </Suspense>
  );
}
