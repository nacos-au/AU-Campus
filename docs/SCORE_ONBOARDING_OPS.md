# AU Score — competition onboarding & past-match cleanup

## Model (do not skip layers)

1. **Club pool** — register players once under **Admin → Players** (unlimited).
2. **Competition squad** — under **Competitions**, nominate a capped subset from that pool.
3. **Match XI** — before each match, set **predicted/confirmed XI + bench** from the competition squad (subs cap comes from the tournament, e.g. 5).
4. **Live / reconcile** — goals need scorer + assist **or Solo**; clean sheets use starting GK (+ GK subs later).

```
Players (club pool)
  → Competition squads (pick N for this comp)
    → Match lineup (XI + up to max_subs)
      → Live keeper OR Reconcile (past matches)
```

## Steps: get every player onto a competition

### A. Clubs exist already

1. Open **Admin → Players**.
2. Sport = Football. Filter/search by club name.
3. Add missing athletes (or Paste list). Matric unique. Positions optional but help XI.
4. Fix wrong names with **Edit**.

### B. Competition exists with teams attached

1. Open **Admin → Competitions** (record keepers see squads-only desk).
2. Select the competition + each club tab.
3. From **Club pool (not yet nominated)**, **Add** until you hit the squad cap (e.g. 25).
4. Repeat for every club in the competition.
5. Empty pool? Go back to Players and register them first — do **not** invent per-comp players.

### C. Predicted XI before each match

1. From **Matches** edit / lineup panel, or Keeper before kick-off.
2. Name **starting XI** + up to **max_subs** (tournament config, typically 5) from that club’s **competition squad**.
3. Status: **Predicted** until T−60 window rules lock / confirm.
4. Update the sheet before every match — same pool, new XI.

## Steps: clean up past / example matches

1. Apply SQL once (hosted): `supabase/score_match_reconcile_APPLY_ALL.sql`.
2. Open **Admin → Matches → Reconcile result**.
3. Search the match → set final score.
4. **Past comps with only the scoreline** (e.g. FOSMAS 2–1 LAW): tick **Score only** → save.
5. When you have scorers: add goal rows — **minute can be blank**, assist can be **Pending** (or Solo / named assister).
6. Pick **one or more GKs** each side when logging scorers — every named keeper gets a clean sheet if that side conceded 0. Not required for score-only.
7. Optionally open match stats (SOT, saves, corners, …).
8. **Save reconcile & complete**.
9. Still-live example matches you never officiated: same flow — complete them or postpone; do not leave fake “live” forever.

## Wipe & recreate: AUSA Inter-Faculty Football Preseason 2026/27

Target only this messy preseason (duplicate Nursing / Nursing FC, wrong dates) — not a generic wipe, and **not** the AUSA Interfaculty Football League seed SQL.

1. **Admin → Competitions** → archive the broken preseason (soft-hides + soft-deletes its matches). Soft-delete any leftover one-off test matches via **Admin → Matches** if needed.
2. Apply once in Supabase SQL editor: [`supabase/score_ausa_preseason_2026_APPLY_ALL.sql`](../supabase/score_ausa_preseason_2026_APPLY_ALL.sql).
   - Creates **AUSA Inter-Faculty Football Preseason** (`2026/27`) with the eight faculty clubs (**Nursing** only — not Nursing FC; MBBS = **Medicine**).
   - Posts completed score-only results:
     - FOSMAS **2–1** LAW
     - MLS **1–1** FONAS
     - Nursing **3–1** Engineering
     - FBMS **1–2** Medicine (MBBS)
   - Kick-offs default to 25–28 Oct 2026 16:00 WAT — edit `scheduled_at` in the SQL if the real dates differ, then re-run.
3. Fill competition squads from club pools (Admin → Competitions).
4. When scorers are known: **Admin → Matches → Reconcile** (add goals / GKs; do not wipe the scorelines).

## Players

- **Edit** names/matric anytime (history stays linked by player id).
- **Delete** removes them from that club pool + competition squads; keeps the row if they already have match events.

## Season awards

1. **Admin → Awards** (keepers allowed).
2. Search real players → set award (custom “Golden Boot” + value, POTS, TOTW…).
3. Publish when accurate. Unpublished stays off public Stats.

## Roles

| Role | Desk |
|------|------|
| Admin | Full `/admin` + Admin Mode |
| Record keeper | Ops desk: Matches (reconcile), Awards, Players edit, Competition squads, `/keeper` |
