import { OG } from "@/lib/og/brand";

/** Shared poster design tokens — AU maroon / ink plane (not generic purple). */
export const POSTER = {
  ...OG,
  cream: "#f7f1e8",
  gold: "#c4a35a",
  field: "#1f4d3a",
} as const;

export function statusPosterLabel(status: string): string {
  switch (status) {
    case "live":
    case "paused":
      return "LIVE";
    case "completed":
      return "FT";
    case "postponed":
      return "POSTPONED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PRE-MATCH";
  }
}

export function formatKickoffShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
