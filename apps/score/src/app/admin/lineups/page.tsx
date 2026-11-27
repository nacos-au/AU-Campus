import { AdminLineupReview } from "@/components/admin/admin-lineup-review";
import { listPendingLineupSubmissions } from "@/lib/data/lineup-links";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lineup approvals · Admin" };

export default async function AdminLineupsPage() {
  const items = await listPendingLineupSubmissions();
  return <AdminLineupReview items={items} />;
}
