"use client";

import { Hourglass, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ClockControlVariant = "football" | "basketball";

/**
 * Football: Playing + Waste (parallel — waste never pauses match clock).
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
  layout = "inline",
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
  /** `stack` = icon above label (keeper sketch). */
  layout?: "inline" | "stack";
}) {
  const btn =
    size === "lg"
      ? "px-4 py-3 text-sm"
      : size === "sm"
        ? "px-2.5 py-1 text-xs"
        : "px-3 py-1.5 text-xs sm:text-sm";
  const playing = isRunning;
  const wasting = isTimeLost;
  const paused = !isRunning;

  if (variant === "football") {
    const stack = layout === "stack";
    return (
      <div className={cn("flex gap-2", stack ? "w-full" : "flex-wrap")}>
        <button
          type="button"
          disabled={disabled}
          onClick={onPlaying}
          className={cn(
            playing
              ? "btn-filled rounded-lg border font-display font-bold"
              : "interactive-btn rounded-lg border border-rule font-display font-bold",
            btn,
            stack && "flex-1",
            disabled && "pointer-events-none opacity-40"
          )}
          aria-pressed={playing}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              stack && "w-full flex-col justify-center gap-1"
            )}
          >
            <Play className={cn(stack ? "h-5 w-5" : "h-3.5 w-3.5")} />
            {playing ? "Playing" : clockOnLabel}
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
            stack && "flex-1",
            disabled && "pointer-events-none opacity-40"
          )}
          aria-pressed={wasting}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              stack && "w-full flex-col justify-center gap-1"
            )}
          >
            <Hourglass className={cn(stack ? "h-5 w-5" : "h-3.5 w-3.5")} />
            {wasting ? "Wasting" : clockOffLabel}
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
