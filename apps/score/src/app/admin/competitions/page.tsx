import { AdminCompetitionsDesk } from "@/components/admin/admin-competitions-desk";
import { getSessionStaff } from "@/lib/auth/roles";

export const metadata = { title: "Competitions · Admin" };

export default async function AdminCompetitionsPage() {
  const staff = await getSessionStaff();
  return <AdminCompetitionsDesk isAdmin={Boolean(staff?.isAdmin)} />;
}
