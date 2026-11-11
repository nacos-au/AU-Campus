import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { createScoreFeedback, listScoreFeedback } from "@/lib/data/feedback";
import type { ScoreFeedbackCategory } from "@/lib/types/database";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const feedback = await listScoreFeedback(150);
  return NextResponse.json({ feedback });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    message?: string;
    category?: ScoreFeedbackCategory;
    page_path?: string | null;
    match_id?: string | null;
    contact_email?: string | null;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const result = await createScoreFeedback({
    message: body.message,
    category: body.category,
    page_path: body.page_path,
    match_id: body.match_id,
    contact_email: body.contact_email,
    user_agent: request.headers.get("user-agent"),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
