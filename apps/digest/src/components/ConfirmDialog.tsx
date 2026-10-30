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

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
  /** When set, shows a text input and resolves with its value (or null). */
  input?: { placeholder?: string; defaultValue?: string; label?: string };
}

type Resolver = (value: boolean | string | null) => void;

const Ctx = createContext<{
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  prompt: (o: ConfirmOptions) => Promise<string | null>;
} | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<Resolver | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean | string | null>((resolve) => {
      resolver.current = resolve;
      setValue(o.input?.defaultValue ?? "");
      setOpts(o);
    });
  }, []);

  const confirm = useCallback(
    (o: ConfirmOptions) => open(o).then((v) => v === true),
    [open]
  );
  const prompt = useCallback(
    (o: ConfirmOptions) =>
      open({ ...o, input: o.input ?? {} }).then((v) =>
        typeof v === "string" ? v : null
      ),
    [open]
  );

  function finish(v: boolean | string | null) {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }

  useEffect(() => {
    if (!opts) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(opts.input ? null : false);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts]);

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) finish(opts.input ? null : false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              finish(opts.input ? value : true);
            }}
            className="w-full max-w-md border-t-4 border-accent bg-paper p-6 shadow-2xl"
          >
            <h2 id="confirm-title" className="font-serif text-xl font-bold leading-snug">
              {opts.title}
            </h2>
            {opts.body && (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{opts.body}</p>
            )}
            {opts.input && (
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {opts.input.label ?? ""}
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={opts.input.placeholder}
                  className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />
              </label>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => finish(opts.input ? null : false)}
                className="border border-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper"
              >
                {opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="submit"
                autoFocus={!opts.input}
                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white ${
                  opts.danger
                    ? "bg-red-700 hover:bg-red-800"
                    : "bg-accent hover:bg-accent-hover"
                }`}
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
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
