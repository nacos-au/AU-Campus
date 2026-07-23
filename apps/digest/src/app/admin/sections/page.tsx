import { requireRole } from "@/lib/auth";
import { SectionsManager } from "./SectionsManager";

export default async function AdminSectionsPage() {
  await requireRole("editor");
  return <SectionsManager />;
}
