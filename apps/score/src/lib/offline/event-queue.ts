/**
 * Offline event queue for Record Keeper UI.
 * Queues match events in localStorage when campus Wi-Fi drops,
 * then syncs via TanStack Query when connectivity returns.
 */

const QUEUE_KEY = "au-score:event-queue";

export interface QueuedEvent {
  id: string;
  matchId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

export function getEventQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function enqueueEvent(matchId: string, payload: Record<string, unknown>): QueuedEvent {
  const event: QueuedEvent = {
    id: crypto.randomUUID(),
    matchId,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  const queue = getEventQueue();
  queue.push(event);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return event;
}

export function dequeueEvent(eventId: string): void {
  const queue = getEventQueue().filter((e) => e.id !== eventId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueueForMatch(matchId: string): QueuedEvent[] {
  return getEventQueue().filter((e) => e.matchId === matchId);
}
