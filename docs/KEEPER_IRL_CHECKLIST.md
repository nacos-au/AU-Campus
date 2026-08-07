# Record keeper — manual IRL checklist

Keepers are **independent**: admin schedules or posts the match; any Score admin or `record_keeper` opens **Keeper**, picks the match, and logs live. No assignment UI.

## Persistence (already in product)

| State | Storage |
|-------|---------|
| Match clock | `localStorage` `au-score-clock-{matchId}` — wall-clock based, flushes on screen-off |
| Event logs | `localStorage` via `useKeeperLogs` |
| Live scores / events posted to API | Survives as long as the write succeeded |

## Before you start

- [ ] Migrations applied (including sport venues + names).
- [ ] Signed in on Score with keeper/admin access.
- [ ] **Admin Mode** (shield) on when you need admin tools.
- [ ] Venues exist for the sport you are testing (Admin → Venues).
- [ ] Keeper page has **no** Matches/Table/Competition sub-nav under it.

## Per sport

For each of **football, basketball, volleyball, tennis, track**:

1. [ ] Admin schedules a match (or use Post result for a finished friendly).
2. [ ] Venue dropdown only lists that sport’s venues.
3. [ ] Open **Keeper** → select the match (Live path preferred).
4. [ ] **Live keeper** / **Post result** selected chips show **white text** on brand fill.
5. [ ] Clock / period controls behave for that sport.
6. [ ] Turn screen off ~10s while clock is running → elapsed has advanced on wake.
7. [ ] Score events log and appear on the public match page.
8. [ ] Pause (where applicable) blocks scoring; resume continues.
9. [ ] Complete match → status and scores look correct on `/matches/[id]`.

### Football extras

- [ ] Goals + assists.
- [ ] Halves advance correctly.
- [ ] Table maths elsewhere stay W=3 D=1 L=0 when standings are shown from completed results.

### Basketball extras

- [ ] Field goals / free throws / period scores.

### Volleyball / tennis extras

- [ ] Set scores and rules banners.

### Track extras

- [ ] Event / results flow (not a two-team scoreline).

## Phantom (optional same session)

- [ ] Start Football Penalty Shootout (no sport picker).
- [ ] Half length / halves use **+/- only** (no typed `0` wipe).
- [ ] Beatrice Cup sets: winner stays; time-draw both leave.
- [ ] Mini league 12/16/32 → groups of 4 validation messages.
- [ ] Pause blocks goals; PAUSED + clock are obvious.
- [ ] Share opens `/phantom/[id]/share` with visible OG card; download/share works.

## Sign-off

| Sport | Tester | Date | Pass? | Notes |
|-------|--------|------|-------|-------|
| Football | | | | |
| Basketball | | | | |
| Volleyball | | | | |
| Tennis | | | | |
| Track | | | | |
