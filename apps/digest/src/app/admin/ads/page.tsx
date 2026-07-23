import { requireRole } from "@/lib/auth";
import { AdsManager } from "./AdsManager";

export default async function AdminAdsPage() {
  await requireRole("editor");
  return <AdsManager />;
}
