-- =============================================================================
-- Score: optional player nickname.
-- first_name / last_name stay the legal name. nickname is display-only so
-- keepers and the public site can toggle between the two. Idempotent.
-- Run this BEFORE deploying the app version that reads players.nickname.
-- =============================================================================

alter table public.players
  add column if not exists nickname varchar(100);

comment on column public.players.nickname is
  'Optional display nickname. Legal name is first_name + last_name; matric_number is the identity key.';
