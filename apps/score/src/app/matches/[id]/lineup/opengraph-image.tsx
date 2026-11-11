import { ImageResponse } from "next/og";
import { fetchMatchById } from "@/lib/data/repository";
import { fetchMatchLineupsBothSides } from "@/lib/data/match-lineups";
import { lineupStatusLabel } from "@/lib/match/lineup-window";
import { POSTER } from "@/lib/posters/brand";
import { PosterShell } from "@/lib/posters/frame";
import { dbIdToSport } from "@/lib/utils/sport";
import { getSportConfig } from "@/lib/utils/sport-config";

export const alt = "AU Score lineups";
export const size = POSTER.size;
export const contentType = "image/png";

function names(lineup: Awaited<ReturnType<typeof fetchMatchLineupsBothSides>>["home"]) {
  if (!lineup) return [] as string[];
  return lineup.resolved
    .filter((p) => p.is_starting)
    .slice(0, 11)
    .map((p) => `${p.first_name[0]}. ${p.last_name}`);
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  const sport = match ? dbIdToSport(match.sport_id) : "football";
  const config = getSportConfig(sport);
  const home = match?.home_team?.name ?? "Home";
  const away = match?.away_team?.name ?? "Away";
  const lineups = match
    ? await fetchMatchLineupsBothSides(id, match.home_team_id, match.away_team_id)
    : { home: null, away: null };
  const status =
    lineups.home?.status === "confirmed" || lineups.away?.status === "confirmed"
      ? "confirmed"
      : "predicted";
  const homeNames = names(lineups.home);
  const awayNames = names(lineups.away);

  return new ImageResponse(
    (
      <PosterShell badge={lineupStatusLabel(status)} footer={match?.tournament?.name ?? config.label}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: POSTER.cream }}>
            {home} vs {away}
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: POSTER.gold }}>{home}</div>
              {homeNames.length ? (
                homeNames.map((n) => (
                  <div key={n} style={{ fontSize: 18, color: POSTER.muted }}>
                    {n}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 18, color: POSTER.muted }}>XI not published</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: POSTER.gold }}>{away}</div>
              {awayNames.length ? (
                awayNames.map((n) => (
                  <div key={`a-${n}`} style={{ fontSize: 18, color: POSTER.muted }}>
                    {n}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 18, color: POSTER.muted }}>XI not published</div>
              )}
            </div>
          </div>
        </div>
      </PosterShell>
    ),
    { ...size }
  );
}
