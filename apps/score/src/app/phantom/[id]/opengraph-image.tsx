import { ImageResponse } from "next/og";
import { memoryGet } from "@/lib/phantom/store";
import { PHANTOM_BRAND, type PhantomSession } from "@/lib/phantom/types";
import { OG } from "@/lib/og/brand";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Phantom session results";
export const size = OG.size;
export const contentType = "image/png";

async function loadSession(id: string): Promise<PhantomSession | null> {
  const mem = memoryGet(id);
  if (mem) return mem;

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("phantom_sessions")
      .select("*")
      .or(`id.eq.${id},code.eq.${id.toUpperCase()}`)
      .is("deleted_at", null)
      .maybeSingle();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      code: String(row.code),
      title: String(row.title),
      status: row.status as PhantomSession["status"],
      settings: row.settings as PhantomSession["settings"],
      matches: (row.matches as PhantomSession["matches"]) ?? [],
      events: (row.events as PhantomSession["events"]) ?? [],
      standings: (row.standings as PhantomSession["standings"]) ?? [],
      active_match_id: (row.active_match_id as string | null) ?? null,
      created_at: String(row.created_at),
      concluded_at: (row.concluded_at as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await loadSession(id);
  const title = session?.title ?? PHANTOM_BRAND.name;
  const format = session?.settings.format ?? "friendly";
  const top = (session?.standings ?? []).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: `linear-gradient(155deg, #0f0a12 0%, ${OG.accent} 100%)`,
          color: OG.ink,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, opacity: 0.8 }}>
              {PHANTOM_BRAND.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, maxWidth: 900 }}>{title}</div>
          </div>
          <div style={{ fontSize: 20, opacity: 0.7 }}>{format}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {top.length === 0 ? (
            <div style={{ fontSize: 28, opacity: 0.75 }}>{PHANTOM_BRAND.tagline}</div>
          ) : (
            top.map((row, i) => (
              <div
                key={row.team_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: i === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                <span>
                  {i + 1}. {row.team_name}
                </span>
                <span>{row.points} pts</span>
              </div>
            ))
          )}
        </div>

        <div style={{ fontSize: 20, opacity: 0.65 }}>AU Score · Phantom results</div>
      </div>
    ),
    { ...size }
  );
}
