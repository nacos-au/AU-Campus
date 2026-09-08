# Record keeper — manual IRL checklist

Keepers are **assigned**, not independent: admin builds the **keeper calendar**, assigns keepers to events; keepers only see their queue (soonest → farthest), **locked unless same calendar day**.

## Persistence

| State | Storage |
|-------|---------|
| Match clock | `localStorage` `au-score-clock-{matchId}` — wall-clock based |
| Event logs | `localStorage` via `useKeeperLogs` |
| Calendar (demo) | `au-score-keeper-events` + assignments |

## Before you start

- [ ] Run `supabase/migrations/20260908140000_keeper_events_calendar.sql`
- [ ] Set hosted Auth session timebox to **2h**
- [ ] Grant `record_keeper` in Campus Office
- [ ] Admin Mode on → **Keeper calendar**: create events + assign keepers

## Flow

1. [ ] Admin creates football season / track events on the calendar.
2. [ ] Admin assigns a keeper to each event.
3. [ ] Keeper opens `/keeper` → sees only assigned events, sorted soonest first.
4. [ ] Future-dated events show **Locked**.
5. [ ] Same-day event shows **Open** → live logging (if match linked) or clear “no match linked” message.
6. [ ] Live / Post-result chips (admin) show white text on brand fill.
7. [ ] Screen-off ~10s with clock running → elapsed advances on wake.

## Per sport smoke

| Sport | Tester | Date | Pass? | Notes |
|-------|--------|------|-------|-------|
| Football | | | | |
| Basketball | | | | |
| Volleyball | | | | |
| Tennis | | | | |
| Track | | | | |

## Tables / stats spot-check

- [ ] Basketball table: Team (inline rank), W, L, WIN% (`.xxx`), GD, Streak, Next — no PF/PA.
- [ ] All sports: no Pos column; ranks are `1`, `2`, …
- [ ] Abbreviation legend under each table.
- [ ] Basketball stats: PPG/RPG/3PG/FG%/APG; Advanced totals link.
- [ ] Awards: no Top Scorer; custom award works.
