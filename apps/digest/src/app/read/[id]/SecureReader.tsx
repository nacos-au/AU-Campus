"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Hardened PDF reader.
 * - Bytes come only from the authenticated proxy route (no storage URL).
 * - Pages render to <canvas>; the watermark is painted INTO the same canvas
 *   (tiled at -45°), so it cannot be stripped by deleting an overlay node.
 * - Context menu, selection, copy, drag, and print shortcuts are blocked;
 *   a print stylesheet blanks the whole page as a final backstop.
 */
export function SecureReader({
  editionId,
  watermark,
}: {
  editionId: string;
  watermark: string;
}) {
  const t = useTranslations("reader");
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const mount = container;

    let cancelled = false;

    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const res = await fetch(`/api/editions/${editionId}/file`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const bytes = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setProgress({ current: 0, total: pdf.numPages });

        const containerWidth = Math.min(mount.clientWidth - 16, 1000);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelled) return;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = containerWidth / base.width;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.className = "mx-auto mb-4 block bg-white shadow-lg";
          canvas.setAttribute("aria-label", `Page ${n}`);

          const ctx = canvas.getContext("2d")!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;

          paintWatermark(ctx, canvas.width, canvas.height, watermark, dpr);

          if (cancelled) return;
          mount.appendChild(canvas);
          setProgress({ current: n, total: pdf.numPages });
          if (n === 1) setStatus("ready");
        }
        setStatus("ready");
      } catch (err) {
        console.error("secure reader:", err);
        if (!cancelled) setStatus("error");
      }
    }

    render();

    // ── Interaction hardening ──
    const block = (e: Event) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "x", "u"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const events: [string, EventListener][] = [
      ["contextmenu", block],
      ["copy", block],
      ["cut", block],
      ["dragstart", block],
      ["selectstart", block],
    ];
    events.forEach(([name, fn]) => document.addEventListener(name, fn));
    document.addEventListener("keydown", blockKeys as EventListener, true);

    return () => {
      cancelled = true;
      events.forEach(([name, fn]) => document.removeEventListener(name, fn));
      document.removeEventListener("keydown", blockKeys as EventListener, true);
      mount.replaceChildren();
    };
  }, [editionId, watermark]);

  return (
    <div className="flex-1 overflow-y-auto px-2 py-6">
      {status === "loading" && (
        <p className="py-16 text-center text-sm text-neutral-400">
          {t("loading")}
        </p>
      )}
      {status === "error" && (
        <p className="py-16 text-center text-sm text-red-400">
          {t("notAvailable")}
        </p>
      )}
      {status === "ready" && progress.total > 0 && (
        <p className="pb-4 text-center text-xs text-neutral-500">
          {t("page", { current: progress.current, total: progress.total })}
        </p>
      )}
      <div ref={containerRef} />
    </div>
  );
}

/** Tiles the buyer's identity across the page at -45°, baked into the canvas. */
function paintWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  dpr: number
) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `600 ${14 * dpr}px system-ui, sans-serif`;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);

  const stepX = 340 * dpr;
  const stepY = 120 * dpr;
  const span = Math.hypot(width, height);
  for (let y = -span; y < span; y += stepY) {
    // Offset alternate rows so cropping can't dodge the marks.
    const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
    for (let x = -span; x < span; x += stepX) {
      ctx.fillText(text, x + offset, y);
    }
  }
  ctx.restore();
}
