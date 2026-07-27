import { cn } from "@/lib/utils/cn";

export function scoreTone(
  home: number,
  away: number,
  side: "home" | "away",
  theme: "light" | "dark" = "light"
): string {
  const win = theme === "dark" ? "text-white font-extrabold" : "text-accent font-extrabold";
  const lose = theme === "dark" ? "text-white/60 font-semibold" : "text-accent/55 font-semibold";
  const tie = theme === "dark" ? "text-white font-extrabold" : "text-accent font-extrabold";

  if (home === away) return tie;
  if (side === "home") return home > away ? `${win} scale-110` : lose;
  return away > home ? `${win} scale-110` : lose;
}

export function scoreClass(
  home: number,
  away: number,
  side: "home" | "away",
  size: "sm" | "lg" = "lg",
  theme: "light" | "dark" = "light"
) {
  const base = size === "lg" ? "font-display tabular-nums transition-all" : "font-display text-sm tabular-nums";
  return cn(base, scoreTone(home, away, side, theme));
}
