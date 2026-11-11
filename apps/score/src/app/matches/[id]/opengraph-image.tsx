import { ImageResponse } from "next/og";
import { fetchMatchById, fetchMatchEvents } from "@/lib/data/repository";
import { formatKickoffShort, POSTER, statusPosterLabel } from "@/lib/posters/brand";
import { PosterShell } from "@/lib/posters/frame";
import { dbIdToSport } from "@/lib/utils/sport";
import { getSportConfig } from "@/lib/utils/sport-config";

export const alt = "AU Score match";
export const size = POSTER.size;
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
  const as_ = match?.away_score ?? 0;
  const status = match?.status ?? "scheduled";
  const badge = statusPosterLabel(status);
  const competition = match?.tournament?.name ?? config.label;
  const venue = match?.venue?.name ?? "";
  const kickoff = formatKickoffShort(match?.scheduled_at);
  const isPre = status === "scheduled" || status === "postponed";
  const showScore = !config.isEventSport && !isPre;

  const events = match ? await fetchMatchEvents(id) : [];
  const scorers = events
    .filter((e) => e.event_type === "goal" || e.event_type === "penalty_scored")
    .slice(0, 4)
    .map((e) => {
      const name = e.player
        ? `${e.player.first_name?.[0] ?? ""}. ${e.player.last_name ?? ""}`.trim()
        : "Goal";
      return `${name} ${e.match_time}`;
    });

  const pens =
    match?.home_penalties != null && match?.away_penalties != null
      ? `Pens ${match.home_penalties}–${match.away_penalties}`
      : null;

  return new ImageResponse(
    (
      <PosterShell badge={badge} footer={competition}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 22, color: POSTER.muted }}>{config.label}</div>

          {config.isEventSport ? (
            <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, color: POSTER.cream }}>
              {home}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <div style={{ fontSize: 40, fontWeight: 800, color: POSTER.cream, maxWidth: 420 }}>
                  {home}
                </div>
                {showScore ? (
                  <div style={{ fontSize: 72, fontWeight: 800 }}>{hs}</div>
                ) : null}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <div style={{ fontSize: 40, fontWeight: 800, color: POSTER.cream, maxWidth: 420 }}>
                  {away}
                </div>
                {showScore ? (
                  <div style={{ fontSize: 72, fontWeight: 800 }}>{as_}</div>
                ) : null}
              </div>
            </div>
          )}

          {isPre ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {kickoff ? (
                <div style={{ fontSize: 26, fontWeight: 700, color: POSTER.gold }}>{kickoff}</div>
              ) : null}
              {venue ? <div style={{ fontSize: 22, color: POSTER.muted }}>{venue}</div> : null}
              {status === "postponed" && match?.postpone_reason ? (
                <div style={{ fontSize: 20, color: "#fbbf24" }}>{match.postpone_reason}</div>
              ) : (
                <div style={{ fontSize: 20, color: POSTER.muted }}>Predicted XI on match page</div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {pens ? (
                <div style={{ fontSize: 24, fontWeight: 700, color: POSTER.gold }}>{pens}</div>
              ) : null}
              {scorers.length > 0 ? (
                <div style={{ fontSize: 20, color: POSTER.muted }}>{scorers.join("  ·  ")}</div>
              ) : (
                <div style={{ fontSize: 20, color: POSTER.muted }}>
                  {status === "live" || status === "paused" ? "Follow live on AU Score" : "Full time"}
                </div>
              )}
            </div>
          )}
        </div>
      </PosterShell>
    ),
    { ...size }
  );
}
