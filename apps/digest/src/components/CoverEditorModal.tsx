"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  COVER_ACCEPT,
  COVER_ASPECT,
  exportCoverCrop,
  validateCoverSource,
} from "@/lib/cover-image";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
  /** Existing cover URL — opens adjust mode when no new file chosen yet. */
  existingUrl?: string | null;
};

export function CoverEditorModal({
  open,
  onClose,
  onSave,
  existingUrl = null,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [fromRemote, setFromRemote] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const revokeLocal = useCallback((url: string | null, remote: boolean) => {
    if (url && !remote) URL.revokeObjectURL(url);
  }, []);

  const reset = useCallback(() => {
    setSrc((prev) => {
      revokeLocal(prev, fromRemote);
      return null;
    });
    setFromRemote(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setError(null);
    setBusy(false);
  }, [fromRemote, revokeLocal]);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setError(null);
    setBusy(false);
    const next = existingUrl?.trim() || null;
    setSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return next;
    });
    setFromRemote(Boolean(next));
  }, [open, existingUrl]);

  function handleClose() {
    reset();
    onClose();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateCoverSource(file);
    if (err) {
      setError(err);
      return;
    }
    revokeLocal(src, fromRemote);
    setError(null);
    setSrc(URL.createObjectURL(file));
    setFromRemote(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function handleSave() {
    if (!src || !croppedArea) {
      setError("Choose a photo and adjust the crop first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await exportCoverCrop(src, croppedArea, {
        crossOrigin: fromRemote,
      });
      await onSave(result.file);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save cover.");
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="cover-editor-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-rule-dark bg-paper p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="cover-editor-title" className="font-serif text-xl font-bold">
              Cover photo
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Drag and zoom to fit a 16:9 frame — used on the article and when
              the link is shared.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-ink-soft hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!src ? (
          <div className="mt-5">
            <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-rule-dark px-4 py-10 text-center hover:border-ink">
              <span className="text-sm font-semibold">Choose a photo</span>
              <span className="mt-1 text-[12px] text-ink-soft">
                Portrait photos are fine — crop to landscape next.
              </span>
              <input
                type="file"
                accept={COVER_ACCEPT}
                className="sr-only"
                onChange={onFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="relative aspect-video w-full overflow-hidden bg-ink/90">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={COVER_ASPECT}
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Zoom
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <p className="text-[12px] text-ink-soft">
              Drag to reposition. Save when the frame looks right.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save cover"}
              </button>
              <label className="cursor-pointer border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper">
                Different photo
                <input
                  type="file"
                  accept={COVER_ACCEPT}
                  className="sr-only"
                  onChange={onFileChange}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleClose}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
