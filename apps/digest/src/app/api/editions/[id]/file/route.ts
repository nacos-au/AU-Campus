import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userOwnsEdition } from "@/lib/purchases";

export const runtime = "nodejs";

/**
 * Secure PDF proxy. The storage bucket is private and its path lives in a
 * table with no client RLS policies, so this route is the ONLY way bytes
 * reach a reader — after a session + purchase check. Responses are never
 * cached and are served inline (no download disposition).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Staff may preview; everyone else must own the edition.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isStaff = profile?.role === "editor" || profile?.role === "admin";

  if (!isStaff && !(await userOwnsEdition(user.id, id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: file } = await admin
    .from("edition_files")
    .select("pdf_path")
    .eq("edition_id", id)
    .maybeSingle();
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: blob, error } = await admin.storage
    .from("editions")
    .download(file.pdf_path);
  if (error || !blob) {
    return NextResponse.json({ error: "file unavailable" }, { status: 404 });
  }

  return new NextResponse(blob.stream(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store, no-transform",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
