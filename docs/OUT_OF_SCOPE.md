# Out of Scope — Future Features

The following features are documented for future implementation but are **not included** in the current build phase.

---

## 1. Player Comparison

A side-by-side statistical comparison tool, inspired by Premier League's "Player Comparison" tab.

### Planned UX

- Select two (or more) players from a search/autocomplete
- Display comparative radar chart or bar chart across key metrics:
  - **Football:** Goals, Assists, Appearances, Cards, Pass Accuracy
  - **Basketball:** PPG, RPG, APG, 3PT%, Fouls
  - **Tennis:** Match W/L, Set W/L, Aces, Break Points
- Filter by season and competition
- Shareable comparison URL (e.g. `/compare?p1=uuid&p2=uuid`)

### Technical Notes

- Requires aggregated player stats views in PostgreSQL
- TanStack Table for stat matrix display
- Optional: Canvas/SVG radar chart component

---

## 2. Head-to-Head (H2H)

Team-vs-team historical record page, inspired by Premier League's "Head-to-head" feature.

**Shipped (match page card):** all-time W-D-L and the last 5 meetings with real club crests (department codes, not a hardcoded "AU"). The summary logic lives in `apps/score/src/lib/match/head-to-head-summary.ts` and is unit tested.

**Still parked:** the extras below.

### Planned UX

- Select Home Club and Away Club
- Display:
  - All-time record (W-D-L)
  - Last 5 meetings with scores
  - Top scorers in this fixture history
  - Home/Away split stats
- Pre-populated when viewing an upcoming match (linked from match page)

### Technical Notes

- PostgreSQL function: `get_h2h_record(team_a_id, team_b_id)`
- Query completed matches where `(home_team_id, away_team_id)` matches either orientation
- Cache results per team-pair in materialized view for performance

---

## 3. Add Fixtures to Calendar

Inspired by the Premier League matches page CTA.

### Planned UX

- Button on the Matches branded section: "Add fixtures to calendar"
- Generates `.ics` file or deep-links to Google/Apple/Outlook calendar
- User selects competition, matchweek, or individual fixtures
- Subscribes to live updates when kickoff times change

### Technical Notes

- Server route to generate ICS from `matches.scheduled_at`
- Optional: webcal subscription URL for ongoing fixture sync

---

## 4. Digest — Public Correction Notes (NYT-style)

Not in the current Digest demo. Distinct from the existing **Updated** byline timestamp and editor version history.

### What it would be

- Optional editor flag when approving an edit: “This is a correction”
- Short public note on the article (e.g. “Correction: An earlier version misstated the vote tally…”)
- Used for **factual error accountability**, not routine copy edits

### Why parked

- **Updated** + version diffs already cover authenticity for the demo
- Corrections need editorial policy copy, UI, and a stored `correction_note` (or similar) — defer until after fair assignment / holds / weekly issues settle

---

## 5. Digest — Timed Scheduler / Auto-Release Cron

**Not building.** Parked posts are **manual only**: editor approves & parks (approved, not live); an editor later clicks **Make live**. No release datetime, no page-load auto-promote, no cron.

### Out of scope

- Embargo / “go live at” datetime on approve
- Vercel Cron, cron-job.org, or `/api/cron/promote-holds`
- Auto-flipping parked → live on site traffic

### In scope (already)

- Status `scheduled` = Parked
- `publish_parked_article` — editors only

Revisit timed release only if the newsroom needs exact-minute go-live without a human click.

---

## 6. Score — Phantom (casual match clock)

**Built but hidden for current deploy.** Casual / off-platform scoring (local + optional cloud sessions under `/phantom`).

### Why parked

- Not part of the official competition / record-keeper product surface this phase
- Nav, header, and footer entry points removed so it is out of the public chrome
- Code and routes retained (`apps/score/src/app/phantom`, APIs, docs/PHANTOM_PERSISTENCE.md) for a later revive — do not delete

### Out of scope (this deploy)

- Advertising Phantom in header, hamburger Tools, or footer
- Treating Phantom as the primary scoring path for AUSA / Inter-Faculty fixtures

Revisit when casual or pickup-game scoring is a product priority.

---

## 7. Digest — Richer Fun Fact extras

**In scope now:** site-wide “Did you know?” cloud trivia (question → reveal answer), daily rotation over an admin-managed `campus_facts` pool.

**Parked for later (full Fun Fact product):**

- Categories / tags and themed packs
- Illustration or photo attachments
- Share cards / social image export
- Streaks, favorites, or “guess before reveal” scoring
- Issue-pinned facts (force a fact for a given Weekly Issue week)
- Analytics on reveal rate

Revisit after the cloud rotator proves retention on the homepage.

---

## 8. Match page and squad polish: parked items

Parked during the match-page MVP polish. Code is kept where it exists so it can be turned back on.

### FINAL podium

- Hidden by `PARKED_FEATURES.finalPodium` in `apps/score/src/lib/match/parked-features.ts`.
- Re-enable: set `finalPodium: false`.

### Dark 0–90 minute strip (H and A)

- Hidden by `PARKED_FEATURES.minuteStrip` in the same file. The component stays in `match-live-panel.tsx`.
- Re-enable: set `minuteStrip: false`.

### Rep accounts and club desk

- Team reps send XIs through a private per-team link (no login). Staff approve every XI.
- Not built: rep sign-in accounts, a club desk that can edit a whole squad, and per-rep permissions.

### Player rating

- Lineup pitch shows no rating. Not built.

### Photos and jersey collection

- Player photos on the pitch and jersey-size collection are not built. Jersey numbers appear only when logged.

### Keeper tracked-stats toggle

- Keepers choosing which stats to log at kickoff or mid-match. Manual entry is blank-by-default, but the picker is not built.

### Lineup shortcuts

- "Copy last XI" and "paste names" are not built.
- "Edit then approve" for rep XIs is not built. Staff edit an XI after approval from the match lineup panel.

---

## 9. Implementation Priority

| Feature | Priority | Depends On |
|---------|----------|------------|
| Player Comparison | Phase 2 | Live player stats aggregation |
| Head-to-Head extras (top scorers, home/away split) | Phase 2 | Match history in database |
| Add Fixtures to Calendar | Phase 2 | Matches in database |
| Digest correction notes | Later | Digest live + editorial policy |
| Digest timed release / cron | Later | Need exact-time go-live without a click |
| Score Phantom (un-hide) | Later | Product priority for casual scoring |
| Digest richer Fun Fact extras | Later | Cloud Q&A rotator live |
| FINAL podium and minute strip (parked flags) | Later | Product priority for the match page |
| Rep accounts and club desk | Later | Team-link submissions proven in use |
| Player rating, photos, jersey collection | Later | Player profile product decisions |
| Keeper tracked-stats toggle | Later | Keeper workflow feedback |

These will be built after the core platform (live scoring, standings, profiles, auth) is complete and connected to Supabase.
