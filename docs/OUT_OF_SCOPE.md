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

## 5. Digest — Dedicated Cron for Parked Posts

**Not building now.** Parked posts (“post later”) already work without a cron: editors set a release time; status stays `scheduled` until that time; the next public page load calls `promote_due_embargoes` and flips due stories live.

### What is parked (out of scope)

- Vercel Cron / cron-job.org / any always-on scheduler hitting `/api/cron/promote-holds`
- Guaranteeing release at the exact minute with zero site traffic

### Why parked

- Free Vercel Hobby cannot run frequent crons; a paid plan or third-party cron is unnecessary for the demo
- Page-load promote is enough for campus traffic and demos
- Revisit only if quiet-hour releases must fire with no visitors

The route and `CRON_SECRET` may remain in the codebase for later; do not wire them for the current phase.

---

## 6. Implementation Priority

| Feature | Priority | Depends On |
|---------|----------|------------|
| Player Comparison | Phase 2 | Live player stats aggregation |
| Head-to-Head | Phase 2 | Match history in database |
| Add Fixtures to Calendar | Phase 2 | Matches in database |
| Digest correction notes | Later | Digest live + editorial policy |
| Digest release cron | Later | Need exact-time release with no traffic |

These will be built after the core platform (live scoring, standings, profiles, auth) is complete and connected to Supabase.
