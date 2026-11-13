"use client";

import { Hourglass, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ClockControlVariant = "football" | "basketball";

/**
 * Football: Playing is sticky (resume only — never toggles off here).
 * Waste toggles stoppage in parallel without pausing match elapsed.
 * Basketball: Clock on/off plus separate Stop/Resume for quarter breaks.
 */
export function MatchClockControls({
  variant,
  isRunning,
  isTimeLost,
  onPlaying,
  onTimeLost,
  onStop,
  onResume,
  clockOnLabel = "Playing",
  clockOffLabel = "Waste",
  size = "md",
  disabled,
}: {
  variant: ClockControlVariant;
  isRunning: boolean;
  isTimeLost: boolean;
  onPlaying: () => void;
  onTimeLost: () => void;
  onStop?: () => void;
  onResume?: () => void;
  clockOnLabel?: string;
  clockOffLabel?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  const btn =
    size === "lg"
      ? "min-h-12 px-4 py-2.5 text-sm"
      : size === "sm"
        ? "px-2.5 py-1 text-xs"
        : "px-3 py-1.5 text-xs sm:text-sm";
  const playing = isRunning;
  const wasting = isTimeLost;
  const paused = !isRunning;

  if (variant === "football") {
    return (
      <div className="flex w-full gap-2">
        <button
          type="button"
          disabled={disabled || playing}
          onClick={onPlaying}
          className={cn(
            playing
              ? "btn-filled cursor-default rounded-lg border font-display font-bold"
              : "interactive-btn rounded-lg border border-rule font-display font-bold",
            btn,
            "flex-1",
            disabled && "pointer-events-none opacity-40"
          )}
          aria-pressed={playing}
          title={playing ? "Match clock is running" : "Resume match clock"}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Play className="h-4 w-4 shrink-0" />
            <span>{playing ? "Playing" : clockOnLabel}</span>
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onTimeLost}
          className={cn(
            wasting
              ? "btn-filled rounded-lg border font-display font-bold"
              : "interactive-btn rounded-lg border border-rule font-display font-bold",
            btn,
            "flex-1",
            disabled && "pointer-events-none opacity-40"
          )}
          aria-pressed={wasting}
          title={wasting ? "Stop accumulating waste / board +N" : "Start waste / stoppage"}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Hourglass className="h-4 w-4 shrink-0" />
            <span>{wasting ? "Wasting" : clockOffLabel}</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onPlaying}
        className={cn(
          playing
            ? "btn-filled rounded-lg border font-display font-bold"
            : "interactive-btn rounded-lg border border-rule font-display font-bold",
          btn,
          disabled && "pointer-events-none opacity-40"
        )}
        aria-pressed={playing}
      >
        {clockOnLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onTimeLost}
        className={cn(
          isTimeLost
            ? "btn-filled rounded-lg border font-display font-bold"
            : "interactive-btn rounded-lg border border-rule font-display font-bold",
          btn,
          disabled && "pointer-events-none opacity-40"
        )}
        aria-pressed={isTimeLost}
      >
        {clockOffLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onResume}
        className={cn(
          "interactive-btn rounded-lg border border-rule font-display font-bold",
          btn,
          disabled && "pointer-events-none opacity-40"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <Play className="h-3.5 w-3.5" />
          Resume
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onStop}
        className={cn(
          paused && !isTimeLost
            ? "btn-filled rounded-lg border font-display font-bold"
            : "interactive-btn rounded-lg border border-rule font-display font-bold",
          btn,
          disabled && "pointer-events-none opacity-40"
        )}
        aria-pressed={paused && !isTimeLost}
      >
        <span className="inline-flex items-center gap-1.5">
          <Pause className="h-3.5 w-3.5" />
          Stop
        </span>
      </button>
    </div>
  );
}
