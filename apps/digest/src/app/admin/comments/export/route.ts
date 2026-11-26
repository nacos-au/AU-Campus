import { NextResponse } from "next/server";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-client";

export const runtime = "nodejs";

/** Spreadsheet formula characters are neutralised so a comment can't run code. */
function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

interface LogRow {
  created_at: string;
  action: string;
  reason: string | null;
  body_snapshot: string | null;
  detail: unknown;
  comment_id: string | null;
  actor: { display_name: string } | null;
  target: { display_name: string } | null;
  article: { title: string } | null;
}

/** Admin-only CSV of the comment moderation log, for reporting to the university. */
export async function GET(req: Request) {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile, "admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const action = url.searchParams.get("action");

  const supabase = await createAuthClient();
  let q = supabase
    .from("comment_mod_log")
    .select(
      "created_at, action, reason, body_snapshot, detail, comment_id, actor:profiles!actor_id(display_name), target:profiles!target_user_id(display_name), article:articles!article_id(title)"
    )
    .order("created_at", { ascending: false })
    .limit(10000);

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    q = q.gte("created_at", `${from}T00:00:00Z`);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const end = new Date(`${to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    q = q.lt("created_at", end.toISOString());
  }
  if (action && /^[a-z_]+$/.test(action)) {
    q = q.eq("action", action);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "When (UTC)",
    "Action",
    "Moderator",
    "Commenter",
    "Story",
    "Reason",
    "Comment text at the time",
    "Comment ID",
    "Details",
  ];
  const rows = ((data ?? []) as unknown as LogRow[]).map((r) =>
    [
      r.created_at,
      r.action,
      r.actor?.display_name ?? "System",
      r.target?.display_name ?? "",
      r.article?.title ?? "",
      r.reason ?? "",
      r.body_snapshot ?? "",
      r.comment_id ?? "",
      r.detail ? JSON.stringify(r.detail) : "",
    ]
      .map(cell)
      .join(",")
  );

  const csv = `\uFEFF${[header.map(cell).join(","), ...rows].join("\r\n")}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="comment-moderation-log-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
