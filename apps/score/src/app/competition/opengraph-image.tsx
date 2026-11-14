import { ImageResponse } from "next/og";
import { getTournamentForSport } from "@/lib/data/demo-competition";
import { getScoreDemoMode } from "@/lib/data/mode";
import { fetchPublicMatches, fetchTournamentForSport } from "@/lib/data/repository";
import { formatKickoffShort, POSTER, statusPosterLabel } from "@/lib/posters/brand";
import { PosterShell } from "@/lib/posters/frame";
import { parseSportParam, sportToDbId, SPORT_LABELS } from "@/lib/utils/sport";

export const alt = "AU Score competition";
export const size = POSTER.size;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** Build-time OG has no request searchParams — default to football. */
export default async function Image(props: {
  searchParams?: Promise<{ sport?: string; competition?: string }> | { sport?: string; competition?: string };
}) {
  const raw = props.searchParams;
  const sp = raw ? await Promise.resolve(raw) : {};
  const sport = typeof sp === "object" && sp && "sport" in sp ? sp.sport : undefined;
  const competition =
    typeof sp === "object" && sp && "competition" in sp ? sp.competition : undefined;

  const activeSport = parseSportParam(sport);
  const sportDbId = sportToDbId(activeSport);
  const demo = await getScoreDemoMode();

  const tournament = demo
    ? getTournamentForSport(sportDbId, competition)
    : await fetchTournamentForSport(sportDbId, competition);

  const fixtures = await fetchPublicMatches({
    sportDbId,
    status: ["live", "paused", "scheduled"],
    limit: 8,
  });
  const live = fixtures.find((m) => m.status === "live" || m.status === "paused");
  const next = fixtures.find((m) => m.status === "scheduled");
  const teaser = live ?? next;

  const title = tournament?.name ?? `${SPORT_LABELS[activeSport]} competition`;
  const season = tournament?.season ? `Season ${tournament.season}` : SPORT_LABELS[activeSport];

  return new ImageResponse(
    (
      <PosterShell badge={SPORT_LABELS[activeSport].toUpperCase()} footer={season}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, color: POSTER.cream, maxWidth: 980 }}>
            {title}
          </div>
          {teaser ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 12,
                padding: 22,
                borderRadius: 18,
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${POSTER.rule}`,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1, color: POSTER.gold }}>
                {statusPosterLabel(teaser.status)}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: POSTER.cream }}>
                {teaser.home_team?.name ?? "TBD"} vs {teaser.away_team?.name ?? "TBD"}
              </div>
              <div style={{ fontSize: 20, color: POSTER.muted }}>
                {teaser.status === "live" || teaser.status === "paused"
                  ? `${teaser.home_score}–${teaser.away_score}`
                  : formatKickoffShort(teaser.scheduled_at)}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 24, color: POSTER.muted }}>Tables, brackets, and fixtures on AU Score</div>
          )}
        </div>
      </PosterShell>
    ),
    { ...size }
  );
}
