import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { createClient } from "@/lib/supabase/server";
import { updatePlayerAvatar, updateTeamLogo } from "@/lib/data/roster";
import { uploadClubLogo, uploadPlayerAvatar, validateImageFile } from "@/lib/uploads";

/**
 * Multipart upload for club logos / player avatars.
 * Demo: returns a data URL and persists it on the entity.
 * Live: uploads to Supabase storage then PATCHes the entity.
 *
 * Form fields: kind ("team_logo" | "player_avatar"), id, file
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const id = String(form.get("id") ?? "").trim();
  const file = form.get("file");

  if (!id || !(file instanceof File)) {
    return NextResponse.json({ error: "id and file are required" }, { status: 400 });
  }

  try {
    validateImageFile(file, 2 * 1024 * 1024);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid image" }, { status: 400 });
  }

  const demo = !hasSupabaseConfig() || (await getScoreDemoMode());
  let url: string;

  if (demo) {
    const buf = Buffer.from(await file.arrayBuffer());
    url = `data:${file.type};base64,${buf.toString("base64")}`;
  } else {
    const supabase = await createClient();
    try {
      url =
        kind === "team_logo"
          ? await uploadClubLogo(supabase, id, file)
          : kind === "player_avatar"
            ? await uploadPlayerAvatar(supabase, id, file)
            : "";
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: "kind must be team_logo or player_avatar" }, { status: 400 });
    }
  }

  if (kind === "team_logo") {
    const result = await updateTeamLogo(id, url);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url, team: result });
  }

  if (kind === "player_avatar") {
    const result = await updatePlayerAvatar(id, url);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url, player: result });
  }

  return NextResponse.json({ error: "kind must be team_logo or player_avatar" }, { status: 400 });
}
