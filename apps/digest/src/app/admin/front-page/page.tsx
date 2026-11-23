import { requireRole } from "@/lib/auth";
import { FrontPageManager } from "./FrontPageManager";

export default async function FrontPageAdminPage() {
  await requireRole("editor");
  return <FrontPageManager />;
}
