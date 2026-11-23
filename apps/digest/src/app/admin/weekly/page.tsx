import { requireRole } from "@/lib/auth";
import { WeeklyBoardManager } from "./WeeklyBoardManager";

export default async function AdminWeeklyPage() {
  await requireRole("editor");
  return <WeeklyBoardManager />;
}
