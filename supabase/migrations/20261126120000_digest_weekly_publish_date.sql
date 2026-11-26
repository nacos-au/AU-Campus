-- Weekly issue: one canonical publish date per issue.
-- Volume / issue number / week number / display title are derived from it in
-- the app (apps/digest/src/lib/weekly.ts). week_start stays as the derived
-- Monday of publish_date and keeps its UNIQUE constraint (one issue per week).

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
