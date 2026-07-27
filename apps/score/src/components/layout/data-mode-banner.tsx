import Link from "next/link";
import { getScoreDemoMode } from "@/lib/data/mode";

export async function DataModeBanner() {
  const demo = await getScoreDemoMode();
  if (demo) return null;

  return (
    <div className="border-b border-accent/20 bg-[#faf9fa] px-4 py-2 text-center text-xs text-accent">
      Live mode — database not wired yet.{" "}
      <Link href="/?demo=1" className="font-bold underline underline-offset-2">
        Switch to Demo
      </Link>{" "}
      for sample matches and tables.
    </div>
  );
}
