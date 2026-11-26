import { requireRole } from "@/lib/auth";
import { fetchCampusWeather } from "@/lib/weather";
import { WeeklyIssueEditor } from "./WeeklyIssueEditor";

export default async function AdminWeeklyPage() {
  await requireRole("editor");
  const weather = await fetchCampusWeather();
  return <WeeklyIssueEditor weather={weather} />;
}
