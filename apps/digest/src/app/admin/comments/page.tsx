import { redirect } from "next/navigation";
import { hasRole, requireRole } from "@/lib/auth";
import { digestFeatures } from "@/lib/features";
import { CommentsModeration } from "./CommentsModeration";

export const metadata = { title: "Comments" };

export default async function AdminCommentsPage() {
  const { profile } = await requireRole("editor");
  if (!digestFeatures.comments) redirect("/admin");
  return <CommentsModeration isAdmin={hasRole(profile, "admin")} />;
}
