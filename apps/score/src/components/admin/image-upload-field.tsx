"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_MB = 2;

export function ImageUploadField({
  label,
  hint,
  fallbackCode,
  currentUrl,
  onPreview,
  onUploaded,
  uploadKind,
  entityId,
  compact,
}: {
  label?: string;
  hint?: string;
  fallbackCode?: string;
  currentUrl?: string | null;
  onPreview?: (url: string | null) => void;
  /** Called after a successful server persist (demo overlay or live storage). */
  onUploaded?: (url: string) => void;
  /** When set with entityId, choosing a file uploads and wires the entity. */
  uploadKind?: "team_logo" | "player_avatar";
  entityId?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Use PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Max ${MAX_MB}MB.`);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    onPreview?.(localUrl);

    if (uploadKind && entityId) {
      setBusy(true);
      try {
        const form = new FormData();
        form.set("kind", uploadKind);
        form.set("id", entityId);
        form.set("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (!res.ok || !json.url) {
          setError(json.error ?? "Upload failed");
          return;
        }
        setPreview(json.url);
        onUploaded?.(json.url);
      } catch {
        setError("Upload failed");
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {label && <p className="font-display text-sm font-extrabold">{label}</p>}
      {hint && <p className="text-xs opacity-60">{hint}</p>}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-full border border-rule bg-surface",
            compact ? "h-10 w-10" : "h-16 w-16"
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className={cn("font-display font-bold text-accent", compact ? "text-xs" : "text-sm")}>
              {fallbackCode ?? "?"}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={busy || (uploadKind ? !entityId : false)}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-rule px-3 py-1.5 font-display text-xs font-bold hover:bg-wrapper disabled:opacity-40 sm:text-sm sm:px-4 sm:py-2"
        >
          {busy ? "Saving…" : preview ? "Change" : "Add photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function SportKeeperTabs({
  sports,
  active,
  onChange,
}: {
  sports: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-rule pb-4">
      {sports.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={cn(
            "rounded-full px-4 py-2 font-display text-sm font-bold",
            active === s.id ? "btn-filled" : "interactive-btn border border-rule bg-white"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
