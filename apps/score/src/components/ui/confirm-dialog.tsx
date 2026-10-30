"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ConfirmOptions {
  title: string;
  /** Supporting copy. Strings keep line breaks; pass a node for richer content. */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
  /** Small eyebrow above the title, e.g. "Admin action". */
  eyebrow?: string;
  /** When set, shows a text input and resolves with its value (or null). */
  input?: { placeholder?: string; defaultValue?: string; label?: string };
}

export interface NotifyOptions {
  title: string;
  body?: ReactNode;
  /** Single dismiss button label. */
  dismissLabel?: string;
  tone?: "info" | "warning";
}

type Pending =
  | { kind: "confirm"; opts: ConfirmOptions }
  | { kind: "notify"; opts: NotifyOptions };

type Resolver = (value: boolean | string | null) => void;

const Ctx = createContext<{
  /** Branded replacement for `window.confirm`. */
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  /** Branded replacement for `window.prompt`. */
  prompt: (o: ConfirmOptions) => Promise<string | null>;
  /** Branded replacement for `window.alert`. */
  notify: (o: NotifyOptions) => Promise<void>;
} | null>(null);

const CLOSE_MS = 220;

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [entered, setEntered] = useState(false);
  const [value, setValue] = useState("");
  const resolver = useRef<Resolver | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);

  const open = useCallback((p: Pending) => {
    return new Promise<boolean | string | null>((resolve) => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      resolver.current = resolve;
      setValue(p.kind === "confirm" ? (p.opts.input?.defaultValue ?? "") : "");
      setPending(p);
    });
  }, []);

  const confirm = useCallback(
    (o: ConfirmOptions) => open({ kind: "confirm", opts: o }).then((v) => v === true),
    [open]
  );
  const prompt = useCallback(
    (o: ConfirmOptions) =>
      open({ kind: "confirm", opts: { ...o, input: o.input ?? {} } }).then((v) =>
        typeof v === "string" ? v : null
      ),
    [open]
  );
  const notify = useCallback(
    (o: NotifyOptions) => open({ kind: "notify", opts: o }).then(() => undefined),
    [open]
  );

  function finish(v: boolean | string | null) {
    const resolve = resolver.current;
    resolver.current = null;
    setEntered(false);
    closeTimer.current = window.setTimeout(() => {
      setPending(null);
      closeTimer.current = null;
    }, CLOSE_MS);
    resolve?.(v);
  }

  useEffect(() => {
    if (!pending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      cancelAnimationFrame(raf);
      window.clearTimeout(focusTimer);
    };
  }, [pending]);

  const isConfirm = pending?.kind === "confirm";
  const confirmOpts = isConfirm ? pending.opts : null;
  const notifyOpts = pending?.kind === "notify" ? pending.opts : null;
  const cancelValue: boolean | string | null = confirmOpts?.input ? null : false;

  function dismiss() {
    if (!pending) return;
    finish(isConfirm ? cancelValue : true);
  }

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const Icon = confirmOpts?.danger
    ? AlertTriangle
    : notifyOpts?.tone === "warning"
      ? AlertTriangle
      : isConfirm
        ? ShieldCheck
        : Info;

  const title = confirmOpts?.title ?? notifyOpts?.title ?? "";
  const body = confirmOpts?.body ?? notifyOpts?.body;

  return (
    <Ctx.Provider value={{ confirm, prompt, notify }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="au-confirm-title"
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className={cn(
              "absolute inset-0 transition-opacity duration-200 ease-out",
              entered ? "opacity-100" : "opacity-0"
            )}
            style={{
              background:
                "linear-gradient(135deg, rgba(26,5,8,0.72) 0%, rgba(61,15,24,0.62) 55%, rgba(0,31,16,0.6) 100%)",
              backdropFilter: "blur(2px)",
            }}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isConfirm) finish(confirmOpts?.input ? value : true);
              else finish(true);
            }}
            className={cn(
              "relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white text-accent shadow-2xl transition-all duration-200 ease-out",
              entered
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-3 scale-[0.97] opacity-0"
            )}
          >
            {/* Brand stripe — echoes the sport nav */}
            <div className={cn("h-1.5", confirmOpts?.danger ? "bg-red-700" : "branded-hero")} />

            <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    confirmOpts?.danger
                      ? "bg-red-50 text-red-700"
                      : "bg-accent/[0.08] text-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  {confirmOpts?.eyebrow && (
                    <p className="font-display text-[11px] font-bold uppercase tracking-wide text-accent/55">
                      {confirmOpts.eyebrow}
                    </p>
                  )}
                  <h2
                    id="au-confirm-title"
                    className="font-display text-lg font-extrabold leading-snug tracking-tight sm:text-xl"
                  >
                    {title}
                  </h2>
                  {body && (
                    <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-accent/75">
                      {body}
                    </div>
                  )}
                </div>
              </div>

              {confirmOpts?.input && (
                <label className="mt-5 block font-display text-xs font-bold uppercase tracking-wide text-accent/60">
                  {confirmOpts.input.label ?? ""}
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={confirmOpts.input.placeholder}
                    className="mt-1.5 block w-full rounded-xl border border-rule px-3.5 py-2.5 font-sans text-sm font-medium normal-case tracking-normal text-accent focus:border-accent focus:outline-none"
                  />
                </label>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {isConfirm && (
                  <button
                    type="button"
                    onClick={() => finish(cancelValue)}
                    className="interactive-btn inline-flex items-center justify-center rounded-full border border-accent/30 bg-white px-5 py-2.5 font-display text-sm font-bold"
                  >
                    {confirmOpts?.cancelLabel ?? "Cancel"}
                  </button>
                )}
                <button
                  type="submit"
                  autoFocus={!confirmOpts?.input}
                  className={cn(
                    "btn-filled inline-flex items-center justify-center rounded-full px-5 py-2.5 font-display text-sm font-bold text-white",
                    confirmOpts?.danger && "!border-red-700 !bg-red-700 hover:!bg-red-800"
                  )}
                >
                  {isConfirm
                    ? (confirmOpts?.confirmLabel ?? "Confirm")
                    : (notifyOpts?.dismissLabel ?? "OK")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
