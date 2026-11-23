import { requireRole } from "@/lib/auth";
import { WordsManager } from "./WordsManager";

export default async function AdminWordsPage() {
  await requireRole("editor");
  return <WordsManager />;
}
