import { ImageResponse } from "next/og";
import { fetchMatchById } from "@/lib/data/repository";
import { OG } from "@/lib/og/brand";
import { dbIdToSport } from "@/lib/utils/sport";
import { getSportConfig } from "@/lib/utils/sport-config";

export const alt = "AU Score match";
export const size = OG.size;
export const contentType = "image/png";

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
  const hs = match?.home_score ?? 0;
  const as = match?.away_score ?? 0;
  const status = match?.status ?? "scheduled";
  const title = config.isEventSport ? home : `${home} vs ${away}`;

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
          background: `linear-gradient(150deg, ${OG.bg} 0%, ${OG.accent} 92%)`,
          color: OG.ink,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, opacity: 0.85 }}>
            AU SCORE
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "8px 16px",
              border: `1px solid ${OG.rule}`,
              borderRadius: 8,
            }}
          >
            {status}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 22, opacity: 0.75 }}>{config.label}</div>
          <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
          {!config.isEventSport && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                fontSize: 72,
                fontWeight: 800,
              }}
            >
              <span>{hs}</span>
              <span style={{ opacity: 0.45, fontSize: 40 }}>—</span>
              <span>{as}</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: 20, opacity: 0.65 }}>Share from AU Score</div>
      </div>
    ),
    { ...size }
  );
}
