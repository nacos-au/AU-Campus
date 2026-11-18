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

## 7. Implementation Priority

| Feature | Priority | Depends On |
|---------|----------|------------|
| Player Comparison | Phase 2 | Live player stats aggregation |
| Head-to-Head | Phase 2 | Match history in database |
| Add Fixtures to Calendar | Phase 2 | Matches in database |
| Digest correction notes | Later | Digest live + editorial policy |
| Digest timed release / cron | Later | Need exact-time go-live without a click |
| Score Phantom (un-hide) | Later | Product priority for casual scoring |

These will be built after the core platform (live scoring, standings, profiles, auth) is complete and connected to Supabase.
