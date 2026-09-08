import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { listRecordKeeperCandidates } from "@/lib/data/keeper-events";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const keepers = await listRecordKeeperCandidates();
  return NextResponse.json({ keepers });
}
