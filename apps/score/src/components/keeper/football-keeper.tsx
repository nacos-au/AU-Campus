"use client";

import type { Match } from "@/lib/types/database";
import { SportKeeper } from "@/components/keeper/sport-keeper";

export function FootballKeeper({ match }: { match: Match }) {
  return <SportKeeper match={match} sport="football" />;
}
