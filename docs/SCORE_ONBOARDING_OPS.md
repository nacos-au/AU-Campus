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
4. Add each goal: minute, side, scorer, type; for open-play goals pick **assister** or **Solo**.
5. Pick **starting GK** each side (clean sheets).
6. Optionally open match stats (SOT, saves, corners, …).
7. **Save reconcile & complete**.
8. Still-live example matches you never officiated: same flow — complete them accurately or postpone; do not leave fake “live” forever.

## Season awards

1. **Admin → Awards** (keepers allowed).
2. Search real players → set award (custom “Golden Boot” + value, POTS, TOTW…).
3. Publish when accurate. Unpublished stays off public Stats.

## Roles

| Role | Desk |
|------|------|
| Admin | Full `/admin` + Admin Mode |
| Record keeper | Ops desk: Matches (reconcile), Awards, Players edit, Competition squads, `/keeper` |
