import { requireRole } from "@/lib/auth";
import { ForumModeration } from "./ForumModeration";

export default async function AdminForumPage() {
  await requireRole("editor");
  return <ForumModeration />;
}
