import { ImageResponse } from "next/og";
import { OG } from "@/lib/og/brand";

export const runtime = "edge";
export const alt = "AU Score — Campus Sports";
export const size = OG.size;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `linear-gradient(145deg, ${OG.bg} 0%, ${OG.accent} 100%)`,
          color: OG.ink,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, opacity: 0.85 }}>
            AU SCORE
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
            Campus sports live
          </div>
          <div style={{ fontSize: 28, color: OG.muted, maxWidth: 820 }}>
            Matches, tables, and keeper tools for Achievers University athletics.
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.7 }}>score.aucampus.app</div>
      </div>
    ),
    { ...size }
  );
}
