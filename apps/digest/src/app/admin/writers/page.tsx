import { requireRole } from "@/lib/auth";
import { WritersManager } from "./WritersManager";

export default async function AdminWritersPage() {
  const { profile } = await requireRole("editor");
  return <WritersManager currentUserId={profile.id} />;
}
