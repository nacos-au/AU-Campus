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
}: {
  label: string;
  hint?: string;
  fallbackCode?: string;
  currentUrl?: string | null;
  onPreview?: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | null) {
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
    const url = URL.createObjectURL(file);
    setPreview(url);
    onPreview?.(url);
  }

  return (
    <div className="space-y-2">
      <p className="font-display text-sm font-extrabold">{label}</p>
      {hint && <p className="text-xs opacity-60">{hint}</p>}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-rule bg-surface">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-sm font-bold text-accent">{fallbackCode ?? "?"}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-rule px-4 py-2 font-display text-sm font-bold hover:bg-wrapper"
        >
          Choose image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs opacity-40">Demo: preview only. Live upload uses Supabase storage when signed in.</p>
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
            active === s.id
              ? "btn-filled"
              : "interactive-btn border border-rule bg-white"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
