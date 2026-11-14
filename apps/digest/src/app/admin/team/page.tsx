import { requireRole } from "@/lib/auth";
import { TeamManager } from "./TeamManager";

export default async function AdminTeamPage() {
  const { profile } = await requireRole("admin");
  return (
    <TeamManager
      currentUserId={profile.id}
      isSuperAdmin={!!profile.is_super_admin}
    />
  );
}
