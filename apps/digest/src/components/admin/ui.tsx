import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={`border border-rule bg-paper ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
          {title && (
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  href,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  hint?: string;
  accent?: boolean;
}) {
  const inner = (
    <>
      <p className={`font-serif text-3xl font-bold tracking-tight ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </>
  );
  const cls = `block border bg-paper p-4 sm:p-5 transition-colors ${
    accent ? "border-accent/40" : "border-rule"
  } ${href ? "hover:border-ink" : ""}`;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="font-serif text-lg font-bold">{title}</p>
      {body && <p className="mt-1 text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "warn" | "danger" | "ok" | "brand";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-gray-100 text-gray-700",
    warn: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
    ok: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    brand: "bg-accent-soft text-accent",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Buttons — keep the whole newsroom on three looks. */
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-1.5 bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-1.5 border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-ink hover:text-paper disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-50",
};

export const input =
  "mt-1 block w-full border border-rule-dark bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none";
export const label =
  "block text-[11px] font-semibold uppercase tracking-wider text-ink-soft";
