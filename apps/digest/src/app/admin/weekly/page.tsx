import { requireRole } from "@/lib/auth";
import { WeeklyManager } from "./WeeklyManager";

export default async function AdminWeeklyPage() {
  await requireRole("editor");
  return <WeeklyManager />;
}
