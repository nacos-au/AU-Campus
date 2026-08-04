import { createPhantomSession } from "@/lib/phantom/engine";
import type { CreatePhantomInput, PhantomSession } from "@/lib/phantom/types";

const STORAGE_KEY = "au-score-phantom-sessions";
const ACTIVE_KEY = "au-score-phantom-active";

/** Server/demo in-memory registry (shareable across requests in same process). */
let memory: PhantomSession[] = [];

function readLocal(): PhantomSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PhantomSession[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(sessions: PhantomSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore */
  }
}

export function listPhantomSessionsLocal(): PhantomSession[] {
  return readLocal().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getPhantomSessionLocal(idOrCode: string): PhantomSession | null {
  return (
    readLocal().find((s) => s.id === idOrCode || s.code === idOrCode.toUpperCase()) ?? null
  );
}

export function savePhantomSessionLocal(session: PhantomSession): void {
  const all = readLocal().filter((s) => s.id !== session.id);
  writeLocal([session, ...all]);
  try {
    localStorage.setItem(ACTIVE_KEY, session.id);
  } catch {
    /* ignore */
  }
}

export function createPhantomSessionLocal(input: CreatePhantomInput): PhantomSession {
  const session = createPhantomSession(input);
  savePhantomSessionLocal(session);
  return session;
}

export function getActivePhantomId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** Server-side memory + merge helpers for API. */
export function memoryUpsert(session: PhantomSession): PhantomSession {
  memory = [session, ...memory.filter((s) => s.id !== session.id)];
  return session;
}

export function memoryGet(idOrCode: string): PhantomSession | null {
  return memory.find((s) => s.id === idOrCode || s.code === idOrCode.toUpperCase()) ?? null;
}

export function memoryList(): PhantomSession[] {
  return memory.slice();
}

export function memoryCreate(input: CreatePhantomInput): PhantomSession {
  return memoryUpsert(createPhantomSession(input));
}
