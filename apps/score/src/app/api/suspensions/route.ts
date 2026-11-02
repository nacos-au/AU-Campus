import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { listSuspensions } from "@/lib/data/suspensions";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const activeOnly = new URL(request.url).searchParams.get("activeOnly") !== "0";
  const suspensions = await listSuspensions({ activeOnly });
  return NextResponse.json({ suspensions });
}
