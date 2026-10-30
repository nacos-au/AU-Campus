import { requireRole } from "@/lib/auth";
import { TalentManager } from "./TalentManager";

export default async function AdminTalentPage() {
  await requireRole("editor");
  return <TalentManager />;
}
