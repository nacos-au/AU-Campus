/**
 * Features hidden from public match pages while the MVP is being polished.
 * The code stays in the repo. Set a flag to `false` to bring the feature back.
 * Each parked item is logged in docs/OUT_OF_SCOPE.md.
 */
export const PARKED_FEATURES = {
  /** FINAL podium on completed matches (components/match/podium-display.tsx). */
  finalPodium: true,
  /** Dark 0-90 minute strip with H / 2x45 / A labels (inside match-live-panel.tsx). */
  minuteStrip: true,
} as const;
