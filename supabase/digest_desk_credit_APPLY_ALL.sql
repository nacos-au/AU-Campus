-- =============================================================================
-- Digest: public desk credit (Writer | Editor only) on profiles.
-- Safe to re-run. Does not backfill — null uses app defaults (admin → writer).
-- =============================================================================

alter table public.profiles
  add column if not exists desk_credit text;

alter table public.profiles
  drop constraint if exists profiles_desk_credit_check;

alter table public.profiles
  add constraint profiles_desk_credit_check
  check (desk_credit is null or desk_credit in ('writer', 'editor'));

comment on column public.profiles.desk_credit is
  'Public article credit line: writer or editor only. Independent of Admin Mode / profiles.role.';
