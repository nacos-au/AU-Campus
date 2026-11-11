"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ShareControls({
  title,
  path,
  posterPath,
  compact = false,
  className,
}: {
  title: string;
  /** App path to share, e.g. `/matches/abc` */
  path: string;
  /** Optional OG poster path for preview / copy */
  posterPath?: string;
  compact?: boolean;
  className?: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  function absoluteUrl(p: string) {
    if (typeof window === "undefined") return p;
    return new URL(p, window.location.origin).toString();
  }

  async function shareNative() {
    const url = absoluteUrl(path);
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied");
    } catch {
      /* dismissed */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl(path));
      setMsg("Link copied");
    } catch {
      setMsg("Could not copy");
    }
  }

  async function copyPoster() {
    if (!posterPath) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl(posterPath));
      setMsg("Poster link copied");
    } catch {
      setMsg("Could not copy");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => void shareNative()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-rule font-display font-bold transition hover:bg-surface",
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
        )}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-rule font-display font-bold transition hover:bg-surface",
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
        )}
      >
        <Copy className="h-3.5 w-3.5" />
        Copy link
      </button>
      {posterPath && (
        <button
          type="button"
          onClick={() => void copyPoster()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-rule font-display font-bold transition hover:bg-surface",
            compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
          )}
        >
          Poster
        </button>
      )}
      {msg && <span className="text-[11px] font-semibold text-accent/60">{msg}</span>}
    </div>
  );
}
