"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Info, Loader2 } from "lucide-react";

function MediaSpinner() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-rule/80"
      aria-hidden
    >
      <Loader2
        className="h-7 w-7 animate-spin text-ink-soft"
        strokeWidth={1.75}
      />
      <span className="sr-only">Loading image</span>
    </div>
  );
}

/**
 * Image description control: hover/focus shows a one-line preview;
 * click/tap toggles the full description under the media.
 * Always shows a spinner until the underlying <img> / Next Image has loaded.
 *
 * Pass sizing classes (e.g. aspect-video) via `className` — they apply to
 * the media shell so Next/Image `fill` keeps a real height.
 */
export function ImageInfo({
  description,
  children,
  className = "",
}: {
  description?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const text = (description ?? "").trim();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    setLoaded(false);
    const root = mediaRef.current;
    if (!root) return;
    const img = root.querySelector("img");
    if (!img) {
      setLoaded(true);
      return;
    }
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    const done = () => setLoaded(true);
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, [children]);

  const markLoaded = () => setLoaded(true);

  const media = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<Record<string, unknown>>;
    const prevOnLoad = el.props.onLoad as ((e: unknown) => void) | undefined;
    const prevComplete = el.props.onLoadingComplete as
      | ((img: HTMLImageElement) => void)
      | undefined;
    return cloneElement(el, {
      onLoad: (e: unknown) => {
        markLoaded();
        prevOnLoad?.(e);
      },
      onLoadingComplete: (img: HTMLImageElement) => {
        markLoaded();
        prevComplete?.(img);
      },
    });
  });

  const shell = (
    <div ref={mediaRef} className={`relative ${className}`.trim()}>
      {media}
      {!loaded && <MediaSpinner />}
      {text ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Hide image description" : "Show image description"}
          title="Image description"
          onClick={() => setOpen((v) => !v)}
          className="image-info-chip group absolute bottom-2 right-2 z-10 flex max-w-[min(100%-1rem,22rem)] items-center gap-0 overflow-hidden rounded-sm bg-paper/95 pl-1.5 pr-1.5 py-1 text-accent shadow-sm ring-1 ring-accent/35 backdrop-blur-sm transition-[box-shadow,background-color] duration-200 hover:bg-paper hover:ring-accent/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Info
            className="h-4 w-4 shrink-0 text-accent"
            strokeWidth={2.25}
            aria-hidden
          />
          <span className="grid max-w-0 grid-cols-[0fr] opacity-0 transition-[max-width,opacity,padding] duration-300 ease-out group-hover:max-w-[18rem] group-hover:grid-cols-[1fr] group-hover:opacity-100 group-hover:pl-1.5 group-focus-visible:max-w-[18rem] group-focus-visible:grid-cols-[1fr] group-focus-visible:opacity-100 group-focus-visible:pl-1.5">
            <span className="min-w-0 overflow-hidden">
              <span className="block truncate text-[11px] font-medium leading-tight text-accent">
                {text}
              </span>
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );

  if (!text) return shell;

  return (
    <div>
      {shell}
      {open && (
        <p
          id={panelId}
          className="image-info-full mt-2 animate-[imageInfoIn_180ms_ease-out] font-sans text-[0.8125rem] leading-snug text-ink-soft"
        >
          {text}
        </p>
      )}
    </div>
  );
}
