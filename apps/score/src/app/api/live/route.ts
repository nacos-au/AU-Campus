import { NextResponse } from "next/server";
import { fetchPublicMatches } from "@/lib/data/repository";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

/** Public list of currently live (and optional upcoming) fixtures. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") as SportId | null;
  const includeUpcoming = url.searchParams.get("upcoming") === "1";

  const matches = await fetchPublicMatches({
    sportDbId: sport ? sportToDbId(sport) : undefined,
    status: includeUpcoming ? ["live", "paused", "scheduled"] : ["live", "paused"],
    limit: 50,
  });

  const live = matches.filter((m) => m.status === "live" || m.status === "paused");
  const upcoming = includeUpcoming
    ? matches.filter((m) => m.status === "scheduled").slice(0, 20)
    : [];

  return NextResponse.json({ live, upcoming });
}
