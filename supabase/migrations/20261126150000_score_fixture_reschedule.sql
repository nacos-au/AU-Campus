-- =============================================================================
-- Score: admin fixture rescheduler.
-- * fixture_schedule_changes — append-only log of every date/time move.
-- * reschedule_fixtures(changes, reason) — atomic, admin-only batch move for
--   league matches and knockout (bracket) fixtures.
-- Idempotent.
-- =============================================================================

create table if not exists public.fixture_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  bracket_fixture_id uuid references public.bracket_fixtures(id) on delete set null,
  old_scheduled_at timestamptz,
  new_scheduled_at timestamptz not null,
  reason text not null,
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fixture_schedule_changes_tournament
  on public.fixture_schedule_changes (tournament_id, created_at desc);
create index if not exists idx_fixture_schedule_changes_match
  on public.fixture_schedule_changes (match_id, created_at desc);
create index if not exists idx_fixture_schedule_changes_bracket
  on public.fixture_schedule_changes (bracket_fixture_id, created_at desc);
create index if not exists idx_fixture_schedule_changes_batch
  on public.fixture_schedule_changes (batch_id);

alter table public.fixture_schedule_changes enable row level security;

-- Public read so match pages can show "Rescheduled from ...".
drop policy if exists "Anyone reads fixture_schedule_changes" on public.fixture_schedule_changes;
create policy "Anyone reads fixture_schedule_changes" on public.fixture_schedule_changes
  for select using (true);

-- No insert/update/delete policies: writes happen only inside reschedule_fixtures().

grant select on public.fixture_schedule_changes to anon, authenticated;

create or replace function public.reschedule_fixtures(p_changes jsonb, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  batch uuid := gen_random_uuid();
  reason text := btrim(coalesce(p_reason, ''));
  item jsonb;
  kind text;
  fid uuid;
  new_at timestamptz;
  m public.matches;
  b public.bracket_fixtures;
  linked public.matches;
  changed int := 0;
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;
  if not private.is_score_admin(actor) then
    raise exception 'Admin access required';
  end if;
  if reason = '' then
    raise exception 'A reason is required';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) = 0 then
    raise exception 'No changes supplied';
  end if;
  if jsonb_array_length(p_changes) > 200 then
    raise exception 'Too many changes in one batch (max 200)';
  end if;

  select nullif(btrim(display_name), '') into actor_name
  from public.profiles where id = actor;

  for item in select * from jsonb_array_elements(p_changes)
  loop
    kind := item ->> 'kind';
    fid := (item ->> 'id')::uuid;
    new_at := (item ->> 'scheduled_at')::timestamptz;

    if kind is null or fid is null or new_at is null then
      raise exception 'Each change needs kind, id and scheduled_at';
    end if;

    if kind = 'match' then
      select * into m from public.matches where id = fid for update;
      if not found or m.deleted_at is not null then
        raise exception 'Match % not found', fid;
      end if;
      if m.status::text not in ('scheduled', 'postponed') then
        raise exception 'Match % is % and cannot be moved', fid, m.status::text;
      end if;
      if m.scheduled_at is not distinct from new_at and m.status::text = 'scheduled' then
        continue;
      end if;

      update public.matches
      set scheduled_at = new_at,
          status = 'scheduled',
          postpone_reason = null
      where id = fid;

      insert into public.fixture_schedule_changes
        (batch_id, tournament_id, match_id, old_scheduled_at, new_scheduled_at,
         reason, changed_by, changed_by_name)
      values
        (batch, m.tournament_id, fid, m.scheduled_at, new_at, reason, actor, actor_name);
      changed := changed + 1;

    elsif kind = 'bracket' then
      select * into b from public.bracket_fixtures where id = fid for update;
      if not found then
        raise exception 'Bracket fixture % not found', fid;
      end if;
      if b.status in ('live', 'completed') then
        raise exception 'Bracket fixture % is % and cannot be moved', fid, b.status;
      end if;
      if b.scheduled_at is not distinct from new_at then
        continue;
      end if;

      update public.bracket_fixtures set scheduled_at = new_at where id = fid;

      -- Keep a linked real match in step with its bracket slot.
      if b.match_id is not null then
        select * into linked from public.matches
        where id = b.match_id and deleted_at is null for update;
        if found and linked.status::text in ('scheduled', 'postponed') then
          update public.matches
          set scheduled_at = new_at, status = 'scheduled', postpone_reason = null
          where id = linked.id;
        end if;
      end if;

      insert into public.fixture_schedule_changes
        (batch_id, tournament_id, match_id, bracket_fixture_id, old_scheduled_at,
         new_scheduled_at, reason, changed_by, changed_by_name)
      values
        (batch, b.tournament_id, b.match_id, fid, b.scheduled_at, new_at, reason,
         actor, actor_name);
      changed := changed + 1;

    else
      raise exception 'Unknown fixture kind: %', kind;
    end if;
  end loop;

  return jsonb_build_object('batch_id', batch, 'changed', changed);
end;
$$;

revoke all on function public.reschedule_fixtures(jsonb, text) from public;
grant execute on function public.reschedule_fixtures(jsonb, text) to authenticated;
