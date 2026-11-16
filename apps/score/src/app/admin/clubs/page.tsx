import { redirect } from "next/navigation";
import { AdminClubsPanel } from "@/components/admin/admin-clubs-panel";
import { getSessionStaff } from "@/lib/auth/roles";

export const metadata = { title: "Clubs · Admin" };

export default async function AdminClubsPage() {
  const staff = await getSessionStaff();
  if (!staff?.canManageCompetitions) {
    redirect("/admin");
  }
  return <AdminClubsPanel />;
}
