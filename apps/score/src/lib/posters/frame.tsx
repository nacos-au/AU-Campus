import type { ReactNode } from "react";
import { POSTER } from "@/lib/posters/brand";

export function PosterShell({
  children,
  footer = "AU Score · Achievers University",
  badge,
}: {
  children: ReactNode;
  footer?: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 52,
        background: `radial-gradient(circle at 12% 18%, rgba(196,163,90,0.22) 0%, transparent 42%), linear-gradient(155deg, ${POSTER.bg} 0%, #2a0f16 48%, ${POSTER.accent} 100%)`,
        color: POSTER.ink,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 4,
              color: POSTER.cream,
            }}
          >
            AU SCORE
          </div>
          <div style={{ fontSize: 16, color: POSTER.muted }}>Campus sports</div>
        </div>
        {badge ? (
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 1,
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: `1px solid ${POSTER.rule}`,
              color: POSTER.cream,
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {children}
      </div>

      <div style={{ fontSize: 18, color: POSTER.muted }}>{footer}</div>
    </div>
  );
}
