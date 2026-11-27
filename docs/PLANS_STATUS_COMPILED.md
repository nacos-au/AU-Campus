# Plans status (compiled)

Audited: 2026-11-28 against the current codebase (`apps/score`, `apps/digest`, `supabase/`).
Source: `~/.cursor/plans/*.plan.md` with todos still marked `pending` or `in_progress`.

**24 plan files** had open todos. Only **11 belong to AU-Campus**. The other **13 are from unrelated projects** (studio/Gerrit, Paystack storefront, wardrobe board, vents site) and have no matching code here.

Frontmatter statuses were stale for most AU-Campus plans: the work shipped but the todos were never ticked. Statuses below come from reading the code, not from running the apps.

## Decisions (2026-11-28)

- **Comments stay live** for AU Digest (core feature). `features.comments` stays `true`.
- **Opt-in stats is a real feature.** Keepers pick which stats to log before kickoff; only picked stats are loggable and shown publicly. Plan `opt-in_match_stats_148aa0eb` stays open, and the `tracked_stats` items in `match_page_mvp_polish` are covered by it.
- **All remaining AU-Campus plans are kept** and run as we go. Next work: legal names + flexible subs, then opt-in stats.
- **Cleanup done:** finished todos ticked in 8 plans; the 13 unrelated-project plans moved to `~/.cursor/plans/archive/` (reversible).

## Open after cleanup

| Plan | Open todos |
|---|---|
| `legal_names_flexible_subs_06a4570a` | 5 of 5 (main work) |
| `opt-in_match_stats_148aa0eb` | 5 of 5 |
| `match_page_mvp_polish_4b12429d` | 5 of 15: `sql` (tracked_stats), `reconcile-xi` (notepad XI), `squads` (`(C)` parse), `stats` (keeper toggle), `admin-review` (copy/paste XI) |
| `weekly_issue_nameplate_aa14a2d7` | 5 of 13: `masthead-panel` (volume/issue override), `newsroom-ui-kit`, `newsroom-nav`, `newsroom-dashboard`, `newsroom-lists-ship` |
| `auo_stack_direction_4a3b5aea` | 7 of 7 (docs, CONTRIBUTING, packages, runbook) |
| `football_system_audit_1f3ddb0b` | 1 of 6: `s2-tables` (verify league tables from real results) |
| `match_result_reconcile_6ea4d7b9` | 1 of 8: `public-stats` (verify clean-sheet leaders path) |
| `writer_edits_on_feedback_page_5324f968` | 1 of 10: `verify` (manual QA) |

Fully closed: `admin_fixture_rescheduler`, `digest_writer_editor_reader`, `article_discussions_mvp`.

## At a glance

| # | Plan | Verdict | What is still open |
|---|------|---------|--------------------|
| 1 | Legal names + flexible subs | **Pending, main open work** | Everything (nickname, name toggle, XI-only sheet, roster-pool subs) |
| 2 | Match page MVP polish | Partly done | `(C)` captain parse on roster upload, notepad XI, copy-last-XI / paste-names, bench validator (see #1) |
| 3 | Weekly issue nameplate | Partly done | Part 3 admin restyle (not started), volume/issue override UI |
| 4 | AUO stack direction | Mostly not done | ARCHITECTURE.md, CONTRIBUTING.md, shared packages, runbook, doc fixes |
| 5 | Article discussions (comments) | Done, product decision needed | Keep live or park (`features.comments`) |
| 6 | Opt-in match stats | **Pending (real feature)** | Everything: `tracked_stats`, keeper picker, public gating |
| 7 | Football system audit | Mostly done, stale | Verify league tables update from real results |
| 8 | Match result reconcile | Done, close | Verify clean-sheet leaders path |
| 9 | Admin fixture rescheduler | Done, close | Minor gaps only; confirm SQL applied |
| 10 | Writer edits on feedback page | Done, close | Manual QA pass |
| 11 | Digest writer / editor / reader | Done, close | Nav differs from plan by design |

Not AU-Campus (13): see the last section.

## Correction to earlier answers

- **Bulk reschedule exists now.** Admin > **Fixtures** (`/admin/fixtures`, `/admin/fixtures/[competitionId]`) edits one match or shifts several by +/- days, logs changes, and shows "Rescheduled" on the public match info. Shipped in commit `e692e80`. Earlier I said there was no bulk UI; that was out of date.
- **The count was 24, not 23.**

---

## Relevant and pending

### 1. Legal names + flexible subs (`legal_names_flexible_subs_06a4570a`)

**Verdict: Not started. This is the main open work.**

| Todo | Status | Evidence |
|---|---|---|
| nickname-schema | Not started | No `nickname` on Score players; no `playerDisplayName` helper |
| name-toggle-ui | Not started | No legal/nickname switch in keeper roster rows |
| xi-only-lineup | Not started, conflicts | `lib/match/lineup-validate.ts:44` and `lib/data/match-lineups.ts:359` still require at least one bench player |
| roster-pool-subs | Partial | `sport-keeper.tsx` already reads `max_subs` (default 5) and has sub pick_out / pick_in; `/api/matches/[id]/roster` returns only named sheet players, not the full competition roster; no `require_named_bench` flag |
| ops-note | Not started | Nothing in `docs/SCORE_ONBOARDING_OPS.md` about cleaned squad lists |

Notes:
- `lineup-merge.ts` already fills bench from the squad when no sheet exists, so XI-only mostly means relaxing the validators and widening the roster API.
- Pitch labels use full names; the nickname toggle must feed that renderer.
- Admin direction: XI only prematch, any roster player as sub up to 5; can revert to a fixed named bench later via flag.

### 2. Match page MVP polish (`match_page_mvp_polish_4b12429d`)

**Verdict: Partly done.** Shipped mainly in `6e66a63` (match page polish, squad desk, team XI links).

Done: lineup merge + predicted XI, pitch full names, minutes with `'`, scorers under banner, H2H, Word of the Day removed from weekly, shared lineup validator, lineup submission links (tables, RPCs, `/lineup/submit/[token]`), `/admin/lineups` review queue, FINAL podium and minute strip parked, OUT_OF_SCOPE updated.

| Todo | Status | Evidence / gap |
|---|---|---|
| sql (`tracked_stats` etc.) | Partial | Captain, availability, formation, cutoff, nullable `match_team_stats` exist; **no `matches.tracked_stats`** (and plan #6 says drop it) |
| reconcile-xi | Partial | Optional XI prompt in reconcile panel exists; **notepad XI names missing** (`admin-match-notepad.tsx`) |
| squads | Partial | Captain/availability/formation panel exists; **`parse-roster.ts` has no `(C)` captain marker** |
| stats | Partial | Card hides unless explicit `match_team_stats` rows; **no keeper `tracked_stats` toggle** (see #6) |
| admin-review | Partial | Link manager + bulk cutoffs + review queue exist; **copy-last-XI and paste-names shortcuts missing** in `AdminMatchLineupPanel` |
| gate-validator | Done, caveat | Still errors on "Name at least one substitute" until #1 ships |

### 3. Weekly issue nameplate (`weekly_issue_nameplate_aa14a2d7`)

**Verdict: Parts 1-2 done (reworked). Part 3 not started.**

- Done: `WeeklyNameplate`, compact masthead on `/weekly`, rich text blocks, scores/brief/note blocks, article "Read the full story" + disclaimers, Standard issue template.
- Changed from plan: no `weekly_issues.masthead` column; settings live in layout JSON (`WeeklyLayout.nameplate`); issue numbering from publish date.
- Open: volume/issue override UI (types exist, no editor field).
- **Not started (Part 3):** restyle `components/admin/ui.tsx`, AdminNav icon rail / collapse / floating bell, dashboard welcome + pill tabs/search, card-row lists, new loading skeleton.

### 4. AUO stack direction (`auo_stack_direction_4a3b5aea`)

**Verdict: Mostly not done** (strategy/docs plan).

| Todo | Status | Evidence |
|---|---|---|
| arch-doc | Not done | No `ARCHITECTURE.md` |
| secret-hygiene | Mostly done for current files | `supabase/to do.md` has no keys; no secrets in tracked files; git history not scanned |
| team-pr-vercel | Not done | No `CONTRIBUTING.md`, no `.github/`; repo visibility / branch protection unknown |
| oss-compose | Partial | README + `docs/SUPABASE_SETUP.md` partial; no single clone guide or compose file |
| packages-extract | Not done | `workspaces: ["apps/*"]` only; Supabase glue duplicated in campus/digest |
| score-api-boundary | Not done | No `apps/api` |
| scale-basics | Not done | No production checklist / runbook |

Doc drift to fix while here: `docs/DEPLOY.md` points at `Japheth-Egbedele/AU-Campus` but the remote is `nacos-au/AU-Campus`; `docs/SUPABASE_SETUP.md` still says Campus has no DB and has an outdated migration list.

### 5. Article discussions MVP (`article_discussions_mvp_ff14103e`)

**Verdict: Fully built and live. Needs a product decision.**

- All seven todos are implemented (SQL, `lib/comments.ts`, `CommentsSection`, `/guidelines`, admin moderation, mock-user cleanup).
- `features.comments` is **`true`**; only forum and talent are `false`. `supabase/to do.md` parks the forum only.
- Decision: leave comments on, or set `comments: false` and note it in `docs/OUT_OF_SCOPE.md` (`/guidelines` would still exist unless gated).
- Not verified: whether `digest_article_comments_APPLY_ALL.sql` is applied on the hosted database.

### 6. Opt-in match stats (`opt-in_match_stats_148aa0eb`)

**Verdict: Pending. Decided to build.**

- Already shipped (stopgap): public stats card shows only explicit `match_team_stats` rows (`explicitStatRows` in `lib/match/match-stats.ts`); card hidden when none logged; reconcile fields are blank-means-null.
- To build: `matches.tracked_stats`, keeper pre-kickoff picker, filtering keeper actions, public gating from the picked list.
- Reconcile the plan with shipped behavior: events currently do not feed the card, so for picked stats the plan must decide whether live event counts feed the card (new) while explicit `match_team_stats` totals still override. Also "selected-but-zero still shows" vs "blank means not recorded".
- The `tracked_stats` items in plan #2 are covered here.

---

## Mostly done, mark complete or update

### 7. Football system audit (`football_system_audit_1f3ddb0b`)

Sprint 2 todos are stale; most is in code.

| Todo | Status |
|---|---|
| Keeper events + FT scores to DB; public reads them | Done (`use-keeper-logs.ts`, `/api/matches/[id]/events`) |
| HT / ET / shootout + sub pairs | Done (`football-period-controls.tsx`, `player_in_*` in sub events) |
| Match XI from competition squad + sheet photo | Mostly done (`match-lineups.ts`, `lineup_image_url`) |
| League tables / bracket advance | Partial: `bracket-advance.ts` runs on complete; **verify tables update from real results** |

### 8. Match result reconcile (`match_result_reconcile_6ea4d7b9`)

Reconcile API and panel are built (`reconcile-match.ts`, `admin-reconcile-panel.tsx`). Open: confirm clean-sheet leaders use the live path (`stat-leaders.ts:144` shows `cleanSheets: []` in one path). Plan wording "events fallback" is outdated.

### 9. Admin fixture rescheduler (`admin_fixture_rescheduler_91572798`)

All todos effectively shipped in `e692e80` (`fixture_schedule_changes`, `reschedule_fixtures`, `lib/schedule/shift-fixtures.ts`, `/admin/fixtures`, editor, public "Rescheduled" note).

Minor gaps: no separate `GET .../schedule` route (pages read data server-side); keepers can still edit `venue_id` on `PATCH /api/matches/[id]` (plan wanted admin-only); no "move existing fixtures" link from the schedule panel. Confirm `supabase/score_fixture_reschedule_APPLY_ALL.sql` was applied.

### 10. Writer edits on feedback page (`writer_edits_on_feedback_page_5324f968`)

Done with a different mechanism: diff is computed at render (`lib/doc-diff.ts`) against a baseline snapshot (migration `20261127120000_digest_review_baseline.sql`), not stored insertion/deletion marks. "Submit revisions", decorations, and inline tracked view are in. Open: manual QA of write, comment, approve, publish, paste. Stale migration header in the baseline SQL mentions a missing `digest_versions_cron_APPLY_ALL.sql`.

### 11. Digest writer / editor / reader (`digest_writer_editor_reader_2b8a5704`)

Done. Header differs from plan by design (AUSA rebrand, Weekly Issue CTA, forum/talent/print editions hidden). Plan's "no public comments" is overtaken by #5.

---

## Not AU-Campus (13 plans)

No matching code in this repo. Move out of this plans folder or archive.

| Plan | Belongs to |
|---|---|
| collection_delete_ladder_ec44d5ae | Gerrit studio collections |
| pricing_qr_gtm_strategy_47eae5d2 | Gerrit pricing / GTM |
| studio_polish_payout_aa1a19c9 | Gerrit studio payout |
| studio_rating_and_menus_1a0c74e9 | Gerrit studio ratings |
| admin_pulse_and_issues_f2c02691 | Gerrit admin |
| live_database_and_google_030d08c5 | Gerrit admin/DB |
| launch_fixes_and_ops_cff9fc11 | Gerrit launch |
| message_board_archive_e27d3f6e | Counselor vents site |
| admin_auth_foundation_1a2b334e | Counselor vents site |
| hero_video_modal_cd982c1e | Founder-clip marketing site |
| wardrobe_decision_board_b676281c | Personal wardrobe app |
| ship-to_and_paystack_e9411dc3 | Paystack storefront |
| paystack_store_template_ebe22d2d | Paystack storefront |

(AU Digest does use Paystack for editions and ads; that is unrelated to the storefront plans.)

---

## Suggested order

1. **Legal names + flexible subs** (#1), including relaxing the bench validator.
2. **Opt-in match stats** (#6), including `tracked_stats` from #2.
3. Small Score gaps from #2: captain `(C)` parse, notepad XI, copy/paste XI.
4. Verify league tables and clean-sheet leaders (#7, #8).
5. AUO docs: ARCHITECTURE.md, CONTRIBUTING.md, DEPLOY/SUPABASE_SETUP fixes (#4).
6. Newsroom restyle Part 3 (#3) when there is appetite.
7. Done: comments decision (stay live) and housekeeping (todos ticked, 13 unrelated plans archived).
