-- Weekly Issue freeform layout document (autosaved board).

alter table public.weekly_issues
  add column if not exists layout jsonb not null default '{"version":1,"blocks":[],"meta":{}}'::jsonb;

comment on column public.weekly_issues.layout is
  'Freeform weekly board: { version, blocks[], meta }';
