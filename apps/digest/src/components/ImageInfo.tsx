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
    const prevOnLoad = el.props.onLoad as
      | ((e: unknown) => void)
      | undefined;
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
          className="image-info-chip group absolute bottom-2 right-2 z-10 flex max-w-[min(100%-1rem,20rem)] items-center gap-1.5 rounded-sm bg-paper/95 px-1.5 py-1 text-ink shadow-sm ring-1 ring-rule-dark backdrop-blur-sm transition-[background-color,box-shadow] hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Info
            className="h-3.5 w-3.5 shrink-0 text-ink-soft"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] leading-tight text-ink-soft opacity-0 transition-[max-width,opacity] duration-200 group-hover:max-w-[16rem] group-hover:opacity-100 group-focus-visible:max-w-[16rem] group-focus-visible:opacity-100">
            <span className="inline-block max-w-[16rem] truncate pl-0.5">
              {text}
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
          className="image-info-full mt-2 font-sans text-[0.8125rem] leading-snug text-ink-soft"
        >
          {text}
        </p>
      )}
    </div>
  );
}
