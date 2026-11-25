-- =============================================================================
-- set_newsroom_role: admin full ladder; editors reader ↔ writer only.
-- =============================================================================

create or replace function public.set_newsroom_role(
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_role text;
  next_role text := lower(trim(p_role));
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;

  if p_user_id is null then
    raise exception 'Pick a person';
  end if;

  if next_role is null or next_role not in ('reader', 'writer', 'editor', 'admin') then
    raise exception 'Invalid role';
  end if;

  select p.role into target_role
  from public.profiles p
  where p.id = p_user_id;

  if target_role is null then
    raise exception 'Person not found';
  end if;

  if actor = p_user_id and not private.is_super_admin(actor) then
    raise exception 'You cannot change your own role';
  end if;

  if private.is_digest_admin(actor) then
    null; -- full ladder
  elsif private.is_digest_editor(actor) then
    if next_role not in ('reader', 'writer') then
      raise exception 'Editors can only set reader or writer';
    end if;
    if target_role not in ('reader', 'writer') then
      raise exception 'Editors can only change readers and writers';
    end if;
  else
    raise exception 'Only editors and admins can change roles';
  end if;

  if target_role = next_role then
    return;
  end if;

  update public.profiles
  set role = next_role
  where id = p_user_id;
end;
$$;

revoke all on function public.set_newsroom_role(uuid, text) from public;
grant execute on function public.set_newsroom_role(uuid, text) to authenticated;

comment on function public.set_newsroom_role(uuid, text) is
  'Newsroom role changes: admins any ladder role; editors reader↔writer only.';
