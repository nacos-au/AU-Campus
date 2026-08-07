# Phantom persistence

Phantom sessions are built to survive brief screen-off, tab sleep, and flaky network.

## What is saved

| Layer | Key / store | When |
|-------|-------------|------|
| Device | `localStorage` → `au-score-phantom-sessions` | Every goal, pause/resume, set end, penalty, period advance, conclude |
| Device | `au-score-phantom-active` | Last opened session id |
| Device | `au-score-phantom-clock-{id}` | Wall-clock timer (`baseElapsed` + `runningStartedAt`) |
| Server | In-memory map (same Node process) | PATCH `/api/phantom/[id]` |
| Cloud | `phantom_sessions` (when Supabase is configured and demo mode is off) | Same PATCH upsert |

## Screen-off / tab sleep

- Session JSON is flushed to `localStorage` on every change and again on `visibilitychange` / `pagehide`.
- The match clock uses **wall time** (`Date.now()`), not only `setInterval`, so elapsed seconds catch up after the phone sleeps.
- If cloud PATCH fails, the UI shows **Saved on this device**.

## Share preview

- Route: `/phantom/[id]/share` — shows the Open Graph results card, download, and share (image + link when the browser supports it).
- Crawlers (WhatsApp, X, etc.) use `/phantom/[id]/opengraph-image` and `twitter-image`.

## Limits

- Clearing site data / another browser / another phone will not see local-only sessions.
- Server memory alone does not survive process restart; use Supabase for durable share links across devices.
- Open Graph previews need the session on the server (or memory) for accurate standings; otherwise a branded generic card is shown.
