"use client";

import { useEffect, useId, type ReactNode } from "react";

/** Small self-contained dialog (public pages have no ConfirmProvider). */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md border-t-4 border-accent bg-paper p-6 shadow-2xl">
        <h2 id={titleId} className="font-serif text-xl font-bold leading-snug">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export const dialogBtn = {
  cancel:
    "border border-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper",
  primary:
    "bg-accent px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50",
  danger:
    "bg-red-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-800 disabled:opacity-50",
} as const;
