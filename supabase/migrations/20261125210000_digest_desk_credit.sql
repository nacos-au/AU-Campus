-- Public byline desk title: writer | editor only (never admin).

alter table public.profiles
  add column if not exists desk_credit text;

alter table public.profiles
  drop constraint if exists profiles_desk_credit_check;

alter table public.profiles
  add constraint profiles_desk_credit_check
  check (desk_credit is null or desk_credit in ('writer', 'editor'));

comment on column public.profiles.desk_credit is
  'Public article credit line: writer or editor only. Independent of Admin Mode / profiles.role.';
