import { requireRole } from "@/lib/auth";
import { FactsManager } from "./FactsManager";

export default async function AdminFactsPage() {
  await requireRole("editor");
  return <FactsManager />;
}
