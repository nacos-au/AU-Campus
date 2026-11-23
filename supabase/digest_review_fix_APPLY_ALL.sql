-- =============================================================================
-- Digest review fix: snapshot_article + review_approve, exclude super admin
-- from auto-assign, reassign queue when an editor is demoted.
-- Safe to re-run. Prefer after newsroom_scale / parked_manual.
-- =============================================================================

alter table public.articles
  add column if not exists content_updated_at timestamptz;

create table if not exists public.article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  version_no int not null,
  snapshot jsonb not null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (article_id, version_no)
);

create index if not exists article_versions_article_idx
  on public.article_versions (article_id, version_no desc);

alter table public.article_versions enable row level security;

drop policy if exists "versions: staff read" on public.article_versions;
create policy "versions: staff read" on public.article_versions
  for select using (
    private.is_digest_editor()
    or exists (
      select 1 from public.articles a
      where a.id = article_id and a.author_id = auth.uid()
    )
  );

create or replace function private.snapshot_article(a public.articles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'title', a.title,
    'dek', a.dek,
    'body', a.body,
    'cover_url', a.cover_url,
    'byline', a.byline,
    'byline_mode', a.byline_mode,
    'series_id', a.series_id,
    'section_id', a.section_id,
    'language', a.language,
    'status', a.status,
    'published_at', a.published_at
  );
$$;

create or replace function private.record_article_version(
  p_article_id uuid,
  p_snapshot jsonb,
  p_note text default null,
  p_actor uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_no int;
begin
  select coalesce(max(version_no), 0) + 1 into next_no
  from public.article_versions
  where article_id = p_article_id;

  insert into public.article_versions (article_id, version_no, snapshot, note, created_by)
  values (p_article_id, next_no, p_snapshot, p_note, p_actor);
end;
$$;

-- Assignable desk editors: newsroom editor/admin only — never super admin.
create or replace function private.digest_editor_count()
returns int
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::int from (
    select p.id
    from public.profiles p
    where p.role in ('editor', 'admin')
      and coalesce(p.is_super_admin, false) = false
    union
    select a.user_id
    from public.app_roles a
    join public.profiles p on p.id = a.user_id
    where a.app = 'digest'
      and a.role = 'admin'
      and coalesce(p.is_super_admin, false) = false
      and p.role not in ('editor', 'admin')
  ) editors;
$$;

create or replace function private.pick_least_busy_editor(exclude_uid uuid default null)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select p.id
  from public.profiles p
  where p.role in ('editor', 'admin')
    and coalesce(p.is_super_admin, false) = false
    and (exclude_uid is null or p.id is distinct from exclude_uid)
  order by (
    select count(*)::int
    from public.articles a
    where a.assigned_editor_id = p.id
      and a.status = 'awaiting_editor'
  ) asc,
  (
    select count(*)::int
    from public.article_revisions r
    where r.assigned_editor_id = p.id
      and r.state = 'awaiting_editor'
  ) asc,
  random()
  limit 1;
$$;

create or replace function private.reassign_editor_queue(p_from uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_editor uuid;
  moved int := 0;
  a record;
begin
  next_editor := private.pick_least_busy_editor(p_from);

  for a in
    select id, title from public.articles
    where assigned_editor_id = p_from
      and status = 'awaiting_editor'
  loop
    if next_editor is null then
      update public.articles
        set assigned_editor_id = null, updated_at = now()
        where id = a.id;
    else
      update public.articles
        set assigned_editor_id = next_editor,
            review_lock_by = null,
            review_lock_at = null,
            updated_at = now()
        where id = a.id;
      perform private.notify(
        next_editor, 'review_requested', a.id,
        'Reassigned to you: ' || a.title
      );
    end if;
    moved := moved + 1;
  end loop;

  update public.article_revisions r
  set assigned_editor_id = next_editor,
      updated_at = now()
  where r.assigned_editor_id = p_from
    and r.state = 'awaiting_editor';

  return moved;
end;
$$;

create or replace function private.profiles_role_reassign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_desk boolean;
  now_desk boolean;
begin
  was_desk := old.role in ('editor', 'admin');
  now_desk := new.role in ('editor', 'admin');
  if was_desk and not now_desk then
    perform private.reassign_editor_queue(old.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_reassign on public.profiles;
create trigger profiles_role_reassign
  after update of role on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function private.profiles_role_reassign();

-- review_approve (manual park / publish) — needs snapshot_article above
drop function if exists public.review_approve(uuid, timestamptz);
drop function if exists public.review_approve(uuid);
drop function if exists public.review_approve(uuid, boolean);

create or replace function public.review_approve(
  p_article_id uuid,
  p_park boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  r public.article_revisions;
  assignee uuid;
  before_snap jsonb;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if not private.is_digest_editor(actor) then
    raise exception 'Only an editor can approve';
  end if;

  select * into r from public.article_revisions
    where article_id = p_article_id and state = 'awaiting_editor';

  if found then
    if actor is distinct from r.assigned_editor_id then
      raise exception 'Only the assigned editor can approve this edit';
    end if;
    if actor = a.author_id and not private.is_sole_digest_editor(actor) then
      raise exception 'You cannot approve your own edit';
    end if;

    before_snap := private.snapshot_article(a);
    perform private.record_article_version(
      p_article_id, before_snap, 'Before approved edit', actor
    );

    update public.articles set
      title = coalesce(r.payload ->> 'title', title),
      dek = r.payload ->> 'dek',
      body = coalesce(r.payload -> 'body', body),
      cover_url = r.payload ->> 'cover_url',
      byline = nullif(trim(coalesce(r.payload ->> 'byline', '')), ''),
      byline_mode = case
        when r.payload ->> 'byline_mode' in ('personal', 'alias')
          then r.payload ->> 'byline_mode'
        else byline_mode
      end,
      series_id = case
        when r.payload ? 'series_id' and nullif(trim(r.payload ->> 'series_id'), '') is null
          then null
        when r.payload ? 'series_id'
          then (r.payload ->> 'series_id')::uuid
        else series_id
      end,
      language = coalesce(r.payload ->> 'language', language),
      section_id = coalesce((r.payload ->> 'section_id')::int, section_id),
      sponsored_by = null,
      content_updated_at = now(),
      updated_at = now()
    where id = p_article_id;

    select * into a from public.articles where id = p_article_id;
    perform private.record_article_version(
      p_article_id,
      private.snapshot_article(a),
      'Approved edit',
      actor
    );

    delete from public.article_revisions where article_id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Your edit is live: ' || a.title
    );
    return;
  end if;

  assignee := a.assigned_editor_id;
  if a.status = 'awaiting_editor' then
    if actor is distinct from assignee then
      raise exception 'Only the assigned editor can approve this article';
    end if;
    if actor = a.author_id and not private.is_sole_digest_editor(actor) then
      raise exception 'You cannot approve your own article';
    end if;
  elsif a.status in ('draft', 'awaiting_writer') then
    if not (actor = a.author_id and private.is_sole_digest_editor(actor)) then
      raise exception 'Submit this article for review first';
    end if;
  else
    raise exception 'Nothing to approve';
  end if;

  before_snap := private.snapshot_article(a);
  perform private.record_article_version(
    p_article_id, before_snap,
    case when p_park then 'Approved & parked' else 'Approved for release' end,
    actor
  );

  if p_park then
    update public.articles
      set status = 'scheduled',
          embargo_at = null,
          published_at = null,
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Approved and parked (not live yet): ' || a.title
    );
  else
    update public.articles
      set status = 'published',
          embargo_at = null,
          published_at = coalesce(published_at, now()),
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Published: ' || a.title
    );
  end if;
end;
$$;

revoke all on function public.review_approve(uuid, boolean) from public;
grant execute on function public.review_approve(uuid, boolean) to authenticated;

-- One-shot: pull any queue items currently sitting on a super admin
do $$
declare
  sid uuid;
begin
  for sid in
    select p.id from public.profiles p
    where coalesce(p.is_super_admin, false)
      and exists (
        select 1 from public.articles a
        where a.assigned_editor_id = p.id and a.status = 'awaiting_editor'
      )
  loop
    perform private.reassign_editor_queue(sid);
  end loop;
end $$;
