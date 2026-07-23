import { requireRole } from "@/lib/auth";
import { EditionsManager } from "./EditionsManager";

export default async function AdminEditionsPage() {
  await requireRole("editor");
  return <EditionsManager />;
}
