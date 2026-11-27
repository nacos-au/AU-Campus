"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  NAME_MODE_STORAGE_KEY,
  nextNameMode,
  parseNameMode,
  type NameMode,
} from "@/lib/players/display-name";

const EVENT = "score-name-mode-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): NameMode {
  try {
    return parseNameMode(window.localStorage.getItem(NAME_MODE_STORAGE_KEY));
  } catch {
    return "legal";
  }
}

function getServerSnapshot(): NameMode {
  return "legal";
}

/** Legal vs nickname display preference, shared across every component and tab. */
export function useNameMode(): [NameMode, () => void, (mode: NameMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback((next: NameMode) => {
    try {
      window.localStorage.setItem(NAME_MODE_STORAGE_KEY, next);
    } catch {
      /* private mode: preference just won't persist */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => setMode(nextNameMode(getSnapshot())), [setMode]);

  return [mode, toggle, setMode];
}
