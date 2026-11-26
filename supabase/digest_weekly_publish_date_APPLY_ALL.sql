-- =============================================================================
-- Digest: weekly issue canonical publish date.
-- Safe to re-run. Backfills publish_date from week_start for existing issues.
-- Run this in the Supabase SQL editor BEFORE using the new weekly editor.
-- =============================================================================

alter table public.weekly_issues
  add column if not exists publish_date date;

update public.weekly_issues
   set publish_date = week_start
 where publish_date is null;

alter table public.weekly_issues
  alter column publish_date set default current_date;

alter table public.weekly_issues
  alter column publish_date set not null;

create index if not exists weekly_issues_publish_date_idx
  on public.weekly_issues (publish_date desc);

comment on column public.weekly_issues.publish_date is
  'Canonical publish date. Volume (Vol. I = 2026), issue number (restarts each year) and week number are derived from it.';
comment on column public.weekly_issues.week_start is
  'Derived: Monday of publish_date. Unique so there is one issue per calendar week.';
