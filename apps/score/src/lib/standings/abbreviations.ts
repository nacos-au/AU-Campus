import type { SportId } from "@/lib/utils/sport";

/** Glossary entries shown under standings / group tables. */
export function standingsAbbreviations(sport: SportId): Array<{ abbr: string; meaning: string }> {
  switch (sport) {
    case "basketball":
      return [
        { abbr: "W", meaning: "Wins" },
        { abbr: "L", meaning: "Losses" },
        { abbr: "WIN%", meaning: "Winning percentage (.xxx)" },
        { abbr: "GD", meaning: "Point differential (points for − points against)" },
        { abbr: "Streak", meaning: "Current run of wins or losses" },
        { abbr: "Next", meaning: "Next scheduled opponent" },
      ];
    case "volleyball":
      return [
        { abbr: "Pl", meaning: "Matches played" },
        { abbr: "W", meaning: "Wins" },
        { abbr: "L", meaning: "Losses" },
        { abbr: "Sets+", meaning: "Sets won" },
        { abbr: "Sets−", meaning: "Sets lost" },
        { abbr: "Pts", meaning: "Competition points" },
        { abbr: "Streak", meaning: "Current run of wins or losses" },
        { abbr: "Next", meaning: "Next scheduled opponent" },
      ];
    case "tennis":
      return [
        { abbr: "P", meaning: "Matches played" },
        { abbr: "W", meaning: "Wins" },
        { abbr: "L", meaning: "Losses" },
        { abbr: "Sets+", meaning: "Sets won" },
        { abbr: "Sets−", meaning: "Sets lost" },
        { abbr: "Pts", meaning: "Competition points" },
        { abbr: "Streak", meaning: "Current run of wins or losses" },
        { abbr: "Next", meaning: "Next scheduled opponent" },
      ];
    case "track":
      return [
        { abbr: "Events", meaning: "Events contested" },
        { abbr: "Gold", meaning: "Gold medals" },
        { abbr: "Silver", meaning: "Silver medals" },
        { abbr: "Bronze", meaning: "Bronze medals" },
        { abbr: "Pts", meaning: "Meet points" },
      ];
    default:
      return [
        { abbr: "Pl", meaning: "Matches played" },
        { abbr: "W", meaning: "Wins" },
        { abbr: "D", meaning: "Draws" },
        { abbr: "L", meaning: "Losses" },
        { abbr: "GF", meaning: "Goals for" },
        { abbr: "GA", meaning: "Goals against" },
        { abbr: "GD", meaning: "Goal difference" },
        { abbr: "Pts", meaning: "Points (Win 3, Draw 1, Loss 0)" },
        { abbr: "Streak", meaning: "Current run of results" },
        { abbr: "Next", meaning: "Next scheduled opponent" },
      ];
  }
}

/** Form streak label e.g. W3 / L2 / D1 from most recent results. */
export function formStreak(form: Array<"W" | "D" | "L"> | undefined | null): string {
  if (!form || form.length === 0) return "—";
  const last = form[form.length - 1]!;
  let n = 0;
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i] !== last) break;
    n++;
  }
  return `${last}${n}`;
}

/** Winning percentage as .xxx (e.g. .800). */
export function winPctDot(won: number, played: number): string {
  if (!played) return ".000";
  return (won / played).toFixed(3).slice(1);
}
