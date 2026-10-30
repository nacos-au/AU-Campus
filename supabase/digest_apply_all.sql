-- =============================================================================
-- AU Digest — all pending migrations in one idempotent file.
-- Safe to run more than once: every policy/trigger is dropped before being
-- recreated, tables/columns use IF NOT EXISTS, functions use OR REPLACE.
-- Paste the whole file into the Supabase SQL editor and run.
-- =============================================================================

-- ───────────────────────────── 20261009120000_digest_assignment_community.sql ─────────────────────────────
-- =============================================================================
-- Digest: second-editor approval, author bios, talent, verified forums
-- Roles stay generic (reader / writer / editor / admin / super admin).
-- An author cannot publish their own article. Submission requires a different
-- editor, and only that assignee can approve or reject.
-- =============================================================================

alter table public.profiles
  add column if not exists bio text,
  add column if not exists forum_karma int not null default 0,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles (id);

alter table public.articles
  add column if not exists assigned_editor_id uuid references public.profiles (id);

create index if not exists articles_assigned_editor_idx
  on public.articles (assigned_editor_id);

-- ─── Who counts as an editor ────────────────────────────────────────────────

create or replace function private.is_digest_editor(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_super_admin(uid)
    or private.has_app_role('digest', 'admin', uid)
    or exists (
      select 1 from public.profiles
      where id = uid and role in ('editor', 'admin')
    );
$$;

create or replace function private.is_verified_member(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and verification_level = 'verified'
  );
$$;

-- Editors may use the forum without a separate verification flag.
create or replace function private.is_forum_member(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_verified_member(uid) or private.is_digest_editor(uid);
$$;

-- ─── Profile column protection ──────────────────────────────────────────────

create or replace function private.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.forum_karma is distinct from old.forum_karma
     and coalesce(current_setting('digest.karma_write', true), '') <> '1'
     and not private.is_super_admin(auth.uid()) then
    raise exception 'Reputation is system-managed';
  end if;

  if not private.is_super_admin(auth.uid()) then
    if new.verification_level is distinct from old.verification_level
       or new.verified_at is distinct from old.verified_at
       or new.verified_by is distinct from old.verified_by then
      raise exception 'Only a super admin can change verification';
    end if;
    if auth.uid() = old.id and new.matric_number is distinct from old.matric_number then
      raise exception 'Only a super admin can change member ID';
    end if;
    if auth.uid() = old.id then
      new.role := old.role;
      new.is_super_admin := old.is_super_admin;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function private.protect_profile_columns();

-- ─── Article gate ───────────────────────────────────────────────────────────

create or replace function private.enforce_article_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' and new.status = 'published' then
    raise exception 'Submit the article for another editor to approve';
  end if;

  if new.status = 'submitted' then
    if new.assigned_editor_id is null or new.assigned_editor_id = new.author_id then
      raise exception 'Assign a different editor';
    end if;
    if not private.is_digest_editor(new.assigned_editor_id) then
      raise exception 'Assignee must be an editor';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.assigned_editor_id is distinct from old.assigned_editor_id then
    if actor = new.author_id
       and old.status in ('draft', 'submitted', 'rejected')
       and new.status in ('draft', 'submitted', 'rejected') then
      null;
    elsif private.is_digest_admin(actor) then
      null;
    else
      raise exception 'Only an admin can reassign this article';
    end if;
    if new.assigned_editor_id = new.author_id then
      raise exception 'Assign a different editor';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.status = 'published'
     and old.status is distinct from 'published' then
    if actor = new.author_id then
      raise exception 'You cannot publish your own article';
    end if;
    if actor is distinct from new.assigned_editor_id then
      raise exception 'Only the assigned editor can publish this article';
    end if;
    if not private.is_digest_editor(actor) then
      raise exception 'Only an editor can publish';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.status = 'rejected'
     and old.status is distinct from 'rejected' then
    if actor = new.author_id or actor is distinct from new.assigned_editor_id then
      raise exception 'Only the assigned editor can reject this article';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'submitted'
     and new.status = 'draft'
     and actor is distinct from new.author_id
     and actor is distinct from old.assigned_editor_id
     and not private.is_digest_admin(actor) then
    raise exception 'Only the author, assigned editor, or an admin can return this to draft';
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'published'
     and new.status is distinct from 'published'
     and not private.is_digest_editor(actor) then
    raise exception 'Only an editor can unpublish';
  end if;

  return new;
end;
$$;

drop trigger if exists articles_enforce_gate on public.articles;
create trigger articles_enforce_gate
  before insert or update on public.articles
  for each row execute function private.enforce_article_gate();

-- Staff may no longer insert a story straight to published.
drop policy if exists "articles: contributors create" on public.articles;
create policy "articles: contributors create" on public.articles
  for insert with check (
    author_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and (
      private.my_role() in ('writer', 'editor', 'admin')
      or private.is_digest_editor()
    )
  );

-- ─── In-person verification (super admin) ───────────────────────────────────

create or replace function public.set_member_verification(
  target_user_id uuid,
  p_verified boolean,
  p_matric text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  matric text := nullif(trim(coalesce(p_matric, '')), '');
begin
  if not private.is_super_admin(auth.uid()) then
    raise exception 'Only a super admin can verify members';
  end if;

  if p_verified then
    if matric is null or char_length(matric) < 3 then
      raise exception 'A member ID is required';
    end if;
    update public.profiles
      set verification_level = 'verified',
          matric_number = matric,
          verified_at = now(),
          verified_by = auth.uid()
      where id = target_user_id;
  else
    update public.profiles
      set verification_level = 'soft',
          verified_at = null,
          verified_by = null
      where id = target_user_id;
  end if;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

revoke all on function public.set_member_verification(uuid, boolean, text) from public;
grant execute on function public.set_member_verification(uuid, boolean, text) to authenticated;

-- ─── Talent ─────────────────────────────────────────────────────────────────

create table if not exists public.talent_spotlights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  discipline text not null
    check (discipline in ('design', 'development', 'writing', 'debate', 'other')),
  headline text not null,
  blurb text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.talent_spotlights enable row level security;

drop policy if exists "talent: public read published" on public.talent_spotlights;
create policy "talent: public read published" on public.talent_spotlights
  for select using (published = true);

drop policy if exists "talent: editors read all" on public.talent_spotlights;
create policy "talent: editors read all" on public.talent_spotlights
  for select using (private.is_digest_editor());

drop policy if exists "talent: editors write" on public.talent_spotlights;
create policy "talent: editors write" on public.talent_spotlights
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

-- ─── Forums ─────────────────────────────────────────────────────────────────

create table if not exists public.forum_categories (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text,
  position int not null default 0
);

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id int not null references public.forum_categories (id),
  author_id uuid not null references public.profiles (id),
  title text not null,
  body text not null,
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'removed')),
  score int not null default 0,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'removed')),
  score int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'post')),
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'post')),
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table if not exists public.forum_filters (
  id serial primary key,
  phrase text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists forum_threads_category_idx
  on public.forum_threads (category_id, created_at desc);
create index if not exists forum_posts_thread_idx
  on public.forum_posts (thread_id, created_at);

alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_votes enable row level security;
alter table public.forum_reports enable row level security;
alter table public.forum_filters enable row level security;

-- Members read visible threads. Editors also read the hidden queue.
drop policy if exists "forum_categories: members read" on public.forum_categories;
create policy "forum_categories: members read" on public.forum_categories
  for select using (private.is_forum_member());

drop policy if exists "forum_categories: editors manage" on public.forum_categories;
create policy "forum_categories: editors manage" on public.forum_categories
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

drop policy if exists "forum_threads: members read visible" on public.forum_threads;
create policy "forum_threads: members read visible" on public.forum_threads
  for select using (status = 'visible' and private.is_forum_member());

drop policy if exists "forum_threads: editors read all" on public.forum_threads;
create policy "forum_threads: editors read all" on public.forum_threads
  for select using (private.is_digest_editor());

drop policy if exists "forum_posts: members read visible" on public.forum_posts;
create policy "forum_posts: members read visible" on public.forum_posts
  for select using (
    status = 'visible'
    and private.is_forum_member()
    and exists (
      select 1 from public.forum_threads t
      where t.id = thread_id and t.status = 'visible'
    )
  );

drop policy if exists "forum_posts: editors read all" on public.forum_posts;
create policy "forum_posts: editors read all" on public.forum_posts
  for select using (private.is_digest_editor());

drop policy if exists "forum_votes: read own" on public.forum_votes;
create policy "forum_votes: read own" on public.forum_votes
  for select using (user_id = (select auth.uid()));

drop policy if exists "forum_reports: editors read" on public.forum_reports;
create policy "forum_reports: editors read" on public.forum_reports
  for select using (private.is_digest_editor());

drop policy if exists "forum_filters: editors manage" on public.forum_filters;
create policy "forum_filters: editors manage" on public.forum_filters
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

insert into public.forum_categories (slug, name, description, position)
values
  ('general', 'General', 'Anything worth discussing.', 1),
  ('campus', 'Campus', 'Life, events, and questions.', 2),
  ('feedback', 'Feedback', 'What the paper should cover next.', 3)
on conflict (slug) do nothing;

-- ─── Forum writes (security definer) ────────────────────────────────────────

create or replace function private.forum_should_hide(body text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.forum_filters f
    where char_length(f.phrase) > 0
      and position(lower(f.phrase) in lower(body)) > 0
  );
$$;

create or replace function public.create_forum_thread(
  p_category_id int,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  karma int;
  new_id uuid;
  next_status text;
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;
  if not private.is_forum_member(actor) then
    raise exception 'Verified members only';
  end if;
  if char_length(trim(p_title)) < 3 or char_length(trim(p_body)) < 1 then
    raise exception 'Add a title and a body';
  end if;

  if not private.is_digest_editor(actor) then
    select forum_karma into karma from public.profiles where id = actor;
    if coalesce(karma, 0) < 10 then
      raise exception 'Reply and earn reputation before starting a thread';
    end if;
  end if;

  next_status := case
    when private.forum_should_hide(p_title || ' ' || p_body) then 'hidden'
    else 'visible'
  end;

  insert into public.forum_threads (category_id, author_id, title, body, status)
  values (p_category_id, actor, trim(p_title), trim(p_body), next_status)
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.create_forum_reply(
  p_thread_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  thread_status text;
  new_id uuid;
  next_status text;
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;
  if not private.is_forum_member(actor) then
    raise exception 'Verified members only';
  end if;
  if char_length(trim(p_body)) < 1 then
    raise exception 'Write a reply';
  end if;

  select status into thread_status from public.forum_threads where id = p_thread_id;
  if thread_status is null or thread_status = 'removed' then
    raise exception 'Thread not found';
  end if;
  if thread_status <> 'visible' and not private.is_digest_editor(actor) then
    raise exception 'Thread not found';
  end if;

  next_status := case
    when private.forum_should_hide(p_body) then 'hidden'
    else 'visible'
  end;

  insert into public.forum_posts (thread_id, author_id, body, status)
  values (p_thread_id, actor, trim(p_body), next_status)
  returning id into new_id;

  if next_status = 'visible' then
    update public.forum_threads
      set reply_count = reply_count + 1,
          updated_at = now()
      where id = p_thread_id;
  end if;

  return new_id;
end;
$$;

create or replace function public.cast_forum_vote(
  p_target_type text,
  p_target_id uuid,
  p_value smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  owner uuid;
  old_value smallint;
  delta int;
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;
  if not private.is_forum_member(actor) then
    raise exception 'Verified members only';
  end if;
  if p_target_type not in ('thread', 'post') or p_value not in (-1, 1) then
    raise exception 'Invalid vote';
  end if;

  if p_target_type = 'thread' then
    select author_id into owner from public.forum_threads where id = p_target_id and status = 'visible';
  else
    select author_id into owner from public.forum_posts where id = p_target_id and status = 'visible';
  end if;
  if owner is null then
    raise exception 'Post not found';
  end if;
  if owner = actor then
    raise exception 'You cannot vote on your own post';
  end if;

  select value into old_value
  from public.forum_votes
  where user_id = actor and target_type = p_target_type and target_id = p_target_id;

  if old_value = p_value then
    return;
  end if;

  delta := p_value - coalesce(old_value, 0);

  insert into public.forum_votes (user_id, target_type, target_id, value)
  values (actor, p_target_type, p_target_id, p_value)
  on conflict (user_id, target_type, target_id)
  do update set value = excluded.value;

  if p_target_type = 'thread' then
    update public.forum_threads set score = score + delta where id = p_target_id;
  else
    update public.forum_posts set score = score + delta where id = p_target_id;
  end if;

  perform set_config('digest.karma_write', '1', true);
  update public.profiles set forum_karma = forum_karma + delta where id = owner;
end;
$$;

create or replace function public.report_forum_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  owner uuid;
  report_count int;
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;
  if not private.is_forum_member(actor) then
    raise exception 'Verified members only';
  end if;
  if p_target_type not in ('thread', 'post') then
    raise exception 'Invalid report';
  end if;

  if p_target_type = 'thread' then
    select author_id into owner from public.forum_threads where id = p_target_id;
  else
    select author_id into owner from public.forum_posts where id = p_target_id;
  end if;
  if owner is null then
    raise exception 'Post not found';
  end if;
  if owner = actor then
    raise exception 'You cannot report your own post';
  end if;

  insert into public.forum_reports (reporter_id, target_type, target_id, reason)
  values (actor, p_target_type, p_target_id, nullif(trim(coalesce(p_reason, '')), ''))
  on conflict (reporter_id, target_type, target_id) do nothing;

  select count(*) into report_count
  from public.forum_reports
  where target_type = p_target_type and target_id = p_target_id;

  if report_count >= 3 then
    if p_target_type = 'thread' then
      update public.forum_threads set status = 'hidden' where id = p_target_id and status = 'visible';
    else
      update public.forum_posts set status = 'hidden' where id = p_target_id and status = 'visible';
    end if;
  end if;
end;
$$;

create or replace function public.moderate_forum_content(
  p_target_type text,
  p_target_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_digest_editor(auth.uid()) then
    raise exception 'Only an editor can moderate';
  end if;
  if p_status not in ('visible', 'hidden', 'removed') or p_target_type not in ('thread', 'post') then
    raise exception 'Invalid moderation';
  end if;

  if p_target_type = 'thread' then
    update public.forum_threads set status = p_status where id = p_target_id;
  else
    update public.forum_posts set status = p_status where id = p_target_id;
  end if;
end;
$$;

revoke all on function public.create_forum_thread(int, text, text) from public;
revoke all on function public.create_forum_reply(uuid, text) from public;
revoke all on function public.cast_forum_vote(text, uuid, smallint) from public;
revoke all on function public.report_forum_content(text, uuid, text) from public;
revoke all on function public.moderate_forum_content(text, uuid, text) from public;

grant execute on function public.create_forum_thread(int, text, text) to authenticated;
grant execute on function public.create_forum_reply(uuid, text) to authenticated;
grant execute on function public.cast_forum_vote(text, uuid, smallint) to authenticated;
grant execute on function public.report_forum_content(text, uuid, text) to authenticated;
grant execute on function public.moderate_forum_content(text, uuid, text) to authenticated;

-- ───────────────────────────── 20261030120000_sole_editor_self_publish.sql ─────────────────────────────
-- =============================================================================
-- Sole editor/admin may publish their own articles.
-- Self-contained: defines digest editor helpers if the earlier community
-- migration has not been applied yet.
-- When more than one digest editor exists, the second-editor gate still applies.
-- =============================================================================

create schema if not exists private;

alter table public.articles
  add column if not exists assigned_editor_id uuid references public.profiles (id);

create index if not exists articles_assigned_editor_idx
  on public.articles (assigned_editor_id);

-- Who counts as an editor (newsroom ladder, digest app admin, or super admin).
create or replace function private.is_digest_editor(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select true
      from public.profiles p
      where p.id = uid
        and (
          p.role in ('editor', 'admin')
          or p.is_super_admin = true
        )
    ),
    false
  )
  or exists (
    select 1
    from public.app_roles a
    where a.user_id = uid
      and a.app = 'digest'
      and a.role = 'admin'
  );
$$;

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
       or p.is_super_admin = true
    union
    select a.user_id
    from public.app_roles a
    where a.app = 'digest' and a.role = 'admin'
  ) editors;
$$;

create or replace function private.is_sole_digest_editor(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_digest_editor(uid) and private.digest_editor_count() = 1;
$$;

-- Prefer platform helper when present; otherwise treat digest admin/editor as staff admin.
create or replace function private.is_digest_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select true
      from public.profiles p
      where p.id = uid
        and (p.role = 'admin' or p.is_super_admin = true)
    ),
    false
  )
  or exists (
    select 1
    from public.app_roles a
    where a.user_id = uid
      and a.app = 'digest'
      and a.role = 'admin'
  );
$$;

create or replace function private.enforce_article_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' and new.status = 'published' then
    if not (
      actor = new.author_id
      and private.is_sole_digest_editor(actor)
    ) then
      raise exception 'Submit the article for another editor to approve';
    end if;
  end if;

  if new.status = 'submitted' then
    if new.assigned_editor_id is null then
      raise exception 'Assign a different editor';
    end if;
    if new.assigned_editor_id = new.author_id
       and not private.is_sole_digest_editor(new.author_id) then
      raise exception 'Assign a different editor';
    end if;
    if not private.is_digest_editor(new.assigned_editor_id) then
      raise exception 'Assignee must be an editor';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.assigned_editor_id is distinct from old.assigned_editor_id then
    if actor = new.author_id
       and old.status in ('draft', 'submitted', 'rejected')
       and new.status in ('draft', 'submitted', 'rejected') then
      null;
    elsif private.is_digest_admin(actor) then
      null;
    else
      raise exception 'Only an admin can reassign this article';
    end if;
    if new.assigned_editor_id = new.author_id
       and not private.is_sole_digest_editor(new.author_id) then
      raise exception 'Assign a different editor';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.status = 'published'
     and old.status is distinct from 'published' then
    if actor = new.author_id then
      if not private.is_sole_digest_editor(actor) then
        raise exception 'You cannot publish your own article';
      end if;
    elsif actor is distinct from new.assigned_editor_id then
      raise exception 'Only the assigned editor can publish this article';
    end if;
    if not private.is_digest_editor(actor) then
      raise exception 'Only an editor can publish';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.status = 'rejected'
     and old.status is distinct from 'rejected' then
    if actor = new.author_id or actor is distinct from new.assigned_editor_id then
      raise exception 'Only the assigned editor can reject this article';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'submitted'
     and new.status = 'draft'
     and actor is distinct from new.author_id
     and actor is distinct from old.assigned_editor_id
     and not private.is_digest_admin(actor) then
    raise exception 'Only the author, assigned editor, or an admin can return this to draft';
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'published'
     and new.status is distinct from 'published'
     and not private.is_digest_editor(actor) then
    raise exception 'Only an editor can unpublish';
  end if;

  return new;
end;
$$;

drop trigger if exists articles_enforce_gate on public.articles;
create trigger articles_enforce_gate
  before insert or update on public.articles
  for each row execute function private.enforce_article_gate();

drop policy if exists "articles: contributors create" on public.articles;
create policy "articles: contributors create" on public.articles
  for insert with check (
    author_id = (select auth.uid())
    and (
      private.my_role() in ('writer', 'editor', 'admin')
      or private.is_digest_editor()
    )
    and (
      status in ('draft', 'submitted')
      or (status = 'published' and private.is_sole_digest_editor())
    )
  );

-- ───────────────────────────── 20261030140000_digest_review_workflow.sql ─────────────────────────────
-- =============================================================================
-- Digest review workflow
--   * byline (series / pen name) separate from the account
--   * statuses: draft -> awaiting_editor <-> awaiting_writer -> published
--   * published edits go through the same process via article_revisions
--   * highlight + general review comments, in-app notifications, article likes
-- Requires 20261030120000_sole_editor_self_publish.sql (digest editor helpers).
-- =============================================================================

create schema if not exists private;

-- ─── Columns ────────────────────────────────────────────────────────────────

alter table public.articles
  add column if not exists byline text,
  add column if not exists like_count int not null default 0;

-- ─── Statuses ───────────────────────────────────────────────────────────────

drop trigger if exists articles_enforce_gate on public.articles;

alter table public.articles drop constraint if exists articles_status_check;

update public.articles set status = 'awaiting_editor' where status = 'submitted';
update public.articles set status = 'awaiting_writer' where status = 'rejected';

alter table public.articles
  add constraint articles_status_check
  check (status in ('draft', 'awaiting_editor', 'awaiting_writer', 'published'));

-- ─── Revisions of live articles ─────────────────────────────────────────────

create table if not exists public.article_revisions (
  article_id uuid primary key references public.articles (id) on delete cascade,
  payload jsonb not null,
  state text not null default 'draft'
    check (state in ('draft', 'awaiting_editor', 'awaiting_writer')),
  assigned_editor_id uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.article_revisions enable row level security;

drop policy if exists "revisions: participants read" on public.article_revisions;
create policy "revisions: participants read" on public.article_revisions
  for select using (
    private.is_digest_editor()
    or assigned_editor_id = (select auth.uid())
    or exists (
      select 1 from public.articles a
      where a.id = article_id and a.author_id = (select auth.uid())
    )
  );

-- ─── Review comments ────────────────────────────────────────────────────────

create table if not exists public.article_review_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  anchor jsonb,
  created_at timestamptz not null default now()
);

create index if not exists article_review_comments_article_idx
  on public.article_review_comments (article_id, created_at);

alter table public.article_review_comments enable row level security;

drop policy if exists "review comments: participants read" on public.article_review_comments;
create policy "review comments: participants read" on public.article_review_comments
  for select using (
    private.is_digest_editor()
    or exists (
      select 1 from public.articles a
      where a.id = article_id
        and (a.author_id = (select auth.uid())
             or a.assigned_editor_id = (select auth.uid()))
    )
    or exists (
      select 1 from public.article_revisions r
      where r.article_id = article_review_comments.article_id
        and r.assigned_editor_id = (select auth.uid())
    )
  );

-- ─── Notifications ──────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  article_id uuid references public.articles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications
  for select using (user_id = (select auth.uid()));

drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own" on public.notifications
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── Likes ──────────────────────────────────────────────────────────────────

create table if not exists public.article_likes (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

alter table public.article_likes enable row level security;

drop policy if exists "likes: read own" on public.article_likes;
create policy "likes: read own" on public.article_likes
  for select using (user_id = (select auth.uid()));

drop policy if exists "likes: like published" on public.article_likes;
create policy "likes: like published" on public.article_likes
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.articles a
      where a.id = article_id and a.status = 'published'
    )
  );

drop policy if exists "likes: unlike own" on public.article_likes;
create policy "likes: unlike own" on public.article_likes
  for delete using (user_id = (select auth.uid()));

create or replace function private.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set like_count = like_count + 1 where id = new.article_id;
  elsif tg_op = 'DELETE' then
    update public.articles set like_count = greatest(like_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

drop trigger if exists article_likes_count on public.article_likes;
create trigger article_likes_count
  after insert or delete on public.article_likes
  for each row execute function private.sync_like_count();

-- ─── Article policies for the new statuses ──────────────────────────────────

drop policy if exists "articles: authors edit unpublished" on public.articles;
create policy "articles: authors edit unpublished" on public.articles
  for update using (
    (select auth.uid()) = author_id
    and status in ('draft', 'awaiting_writer', 'awaiting_editor')
  )
  with check (
    (select auth.uid()) = author_id
    and status in ('draft', 'awaiting_writer', 'awaiting_editor')
  );

drop policy if exists "articles: contributors create" on public.articles;
create policy "articles: contributors create" on public.articles
  for insert with check (
    author_id = (select auth.uid())
    and (
      private.my_role() in ('writer', 'editor', 'admin')
      or private.is_digest_editor()
    )
    and (
      status in ('draft', 'awaiting_editor')
      or (status = 'published' and private.is_sole_digest_editor())
    )
  );

-- ─── Gate trigger ───────────────────────────────────────────────────────────

create or replace function private.enforce_article_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  -- SQL editor / service role: no end-user actor, no gate.
  if actor is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'published'
       and not (actor = new.author_id and private.is_sole_digest_editor(actor)) then
      raise exception 'Submit the article for another editor to approve';
    end if;
  end if;

  if new.status = 'awaiting_editor' then
    if new.assigned_editor_id is null then
      raise exception 'Assign a different editor';
    end if;
    if new.assigned_editor_id = new.author_id
       and not private.is_sole_digest_editor(new.author_id) then
      raise exception 'Assign a different editor';
    end if;
    if not private.is_digest_editor(new.assigned_editor_id) then
      raise exception 'Assignee must be an editor';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.assigned_editor_id is distinct from old.assigned_editor_id then
      if actor = new.author_id
         and old.status in ('draft', 'awaiting_writer', 'awaiting_editor')
         and new.status in ('draft', 'awaiting_writer', 'awaiting_editor') then
        null;
      elsif private.is_digest_admin(actor) then
        null;
      else
        raise exception 'Only an admin can reassign this article';
      end if;
      if new.assigned_editor_id = new.author_id
         and not private.is_sole_digest_editor(new.author_id) then
        raise exception 'Assign a different editor';
      end if;
    end if;

    if new.status = 'published' and old.status is distinct from 'published' then
      if actor = new.author_id then
        if not private.is_sole_digest_editor(actor) then
          raise exception 'You cannot publish your own article';
        end if;
      elsif actor is distinct from new.assigned_editor_id then
        raise exception 'Only the assigned editor can publish this article';
      end if;
      if not private.is_digest_editor(actor) then
        raise exception 'Only an editor can publish';
      end if;
    end if;

    if new.status = 'awaiting_writer' and old.status is distinct from 'awaiting_writer' then
      if actor = new.author_id or actor is distinct from old.assigned_editor_id then
        raise exception 'Only the assigned editor can send this back to the writer';
      end if;
    end if;

    if old.status = 'awaiting_editor'
       and new.status = 'draft'
       and actor is distinct from new.author_id
       and actor is distinct from old.assigned_editor_id
       and not private.is_digest_admin(actor) then
      raise exception 'Only the author, assigned editor, or an admin can return this to draft';
    end if;

    if old.status = 'published'
       and new.status is distinct from 'published'
       and not private.is_digest_editor(actor) then
      raise exception 'Only an editor can unpublish';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists articles_enforce_gate on public.articles;
create trigger articles_enforce_gate
  before insert or update on public.articles
  for each row execute function private.enforce_article_gate();

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function private.notify(
  p_user uuid,
  p_type text,
  p_article uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, type, article_id, body)
  values (p_user, p_type, p_article, p_body);
end;
$$;

-- Editor currently responsible for a review (live revision or first draft).
create or replace function private.review_assignee(p_article uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select r.assigned_editor_id
       from public.article_revisions r
      where r.article_id = p_article and r.state = 'awaiting_editor'),
    (select a.assigned_editor_id from public.articles a where a.id = p_article)
  );
$$;

-- ─── Workflow RPCs ──────────────────────────────────────────────────────────

create or replace function public.save_revision(
  p_article_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  current_state text;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.status <> 'published' then
    raise exception 'Only live articles use revisions';
  end if;
  if actor is distinct from a.author_id and not private.is_digest_editor(actor) then
    raise exception 'Not allowed to edit this article';
  end if;

  select state into current_state
  from public.article_revisions where article_id = p_article_id;

  if current_state = 'awaiting_editor' then
    raise exception 'This revision is with the editor';
  end if;

  insert into public.article_revisions (article_id, payload, state)
  values (p_article_id, p_payload, coalesce(current_state, 'draft'))
  on conflict (article_id) do update
    set payload = excluded.payload, updated_at = now();
end;
$$;

create or replace function public.submit_article(
  p_article_id uuid,
  p_editor uuid
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
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.author_id is distinct from actor then
    raise exception 'Only the author can submit this article';
  end if;
  if p_editor is null then
    raise exception 'Assign a different editor';
  end if;
  if p_editor = actor and not private.is_sole_digest_editor(actor) then
    raise exception 'Assign a different editor';
  end if;
  if not private.is_digest_editor(p_editor) then
    raise exception 'Assignee must be an editor';
  end if;

  if a.status = 'published' then
    select * into r from public.article_revisions where article_id = p_article_id;
    if not found then
      raise exception 'Make an edit before submitting';
    end if;
    if r.state = 'awaiting_editor' then
      raise exception 'Already with the editor';
    end if;
    update public.article_revisions
      set state = 'awaiting_editor', assigned_editor_id = p_editor, updated_at = now()
      where article_id = p_article_id;
    perform private.notify(
      p_editor, 'review_requested', p_article_id,
      'Edit awaiting your review: ' || a.title
    );
  else
    if a.status not in ('draft', 'awaiting_writer') then
      raise exception 'Already with the editor';
    end if;
    update public.articles
      set status = 'awaiting_editor', assigned_editor_id = p_editor
      where id = p_article_id;
    perform private.notify(
      p_editor, 'review_requested', p_article_id,
      'New submission awaiting your review: ' || a.title
    );
  end if;
end;
$$;

create or replace function public.review_request_changes(
  p_article_id uuid,
  p_note text default null
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
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  assignee := private.review_assignee(p_article_id);
  if actor is distinct from assignee or actor = a.author_id then
    raise exception 'Only the assigned editor can request changes';
  end if;

  select * into r from public.article_revisions
    where article_id = p_article_id and state = 'awaiting_editor';

  if found then
    update public.article_revisions
      set state = 'awaiting_writer', updated_at = now()
      where article_id = p_article_id;
  elsif a.status = 'awaiting_editor' then
    update public.articles set status = 'awaiting_writer' where id = p_article_id;
  else
    raise exception 'Nothing to review';
  end if;

  if p_note is not null and char_length(trim(p_note)) > 0 then
    insert into public.article_review_comments (article_id, author_id, body)
    values (p_article_id, actor, trim(p_note));
  end if;

  perform private.notify(
    a.author_id, 'changes_requested', p_article_id,
    'Changes requested on: ' || a.title
  );
end;
$$;

create or replace function public.review_approve(p_article_id uuid)
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
    update public.articles set
      title = coalesce(r.payload ->> 'title', title),
      dek = r.payload ->> 'dek',
      body = coalesce(r.payload -> 'body', body),
      cover_url = r.payload ->> 'cover_url',
      byline = nullif(trim(coalesce(r.payload ->> 'byline', '')), ''),
      language = coalesce(r.payload ->> 'language', language),
      section_id = coalesce((r.payload ->> 'section_id')::int, section_id)
    where id = p_article_id;
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

  update public.articles
    set status = 'published',
        published_at = coalesce(published_at, now()),
        assigned_editor_id = coalesce(assigned_editor_id, actor)
    where id = p_article_id;

  perform private.notify(
    a.author_id, 'approved', p_article_id,
    'Published: ' || a.title
  );
end;
$$;

create or replace function public.add_review_comment(
  p_article_id uuid,
  p_body text,
  p_anchor jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  assignee uuid;
  new_id uuid;
  target uuid;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  assignee := private.review_assignee(p_article_id);
  if not (
    actor = a.author_id
    or actor = assignee
    or private.is_digest_editor(actor)
  ) then
    raise exception 'Not part of this review';
  end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'Write a comment';
  end if;

  insert into public.article_review_comments (article_id, author_id, body, anchor)
  values (p_article_id, actor, trim(p_body), p_anchor)
  returning id into new_id;

  target := case when actor = a.author_id then assignee else a.author_id end;
  perform private.notify(
    target, 'review_comment', p_article_id,
    'New comment on: ' || a.title
  );

  return new_id;
end;
$$;

create or replace function public.mark_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
    set read_at = now()
    where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.save_revision(uuid, jsonb) from public;
revoke all on function public.submit_article(uuid, uuid) from public;
revoke all on function public.review_request_changes(uuid, text) from public;
revoke all on function public.review_approve(uuid) from public;
revoke all on function public.add_review_comment(uuid, text, jsonb) from public;
revoke all on function public.mark_notifications_read() from public;

grant execute on function public.save_revision(uuid, jsonb) to authenticated;
grant execute on function public.submit_article(uuid, uuid) to authenticated;
grant execute on function public.review_request_changes(uuid, text) to authenticated;
grant execute on function public.review_approve(uuid) to authenticated;
grant execute on function public.add_review_comment(uuid, text, jsonb) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;

-- ───────────────────────────── 20261030160000_digest_ads_commerce.sql ─────────────────────────────
-- =============================================================================
-- Digest advertising
--   * ads become sellable bookings: advertiser, flight dates, weight, price,
--     Paystack payment, review status, impression/click counters
--   * sponsored articles ("Presented by …")
-- =============================================================================

alter table public.ads
  add column if not exists advertiser_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists weight int not null default 1 check (weight between 1 and 10),
  add column if not exists price_kobo int not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists paystack_reference text unique,
  add column if not exists impressions int not null default 0,
  add column if not exists clicks int not null default 0,
  add column if not exists status text not null default 'approved'
    check (status in ('pending_payment', 'pending_review', 'approved', 'rejected'));

create index if not exists ads_live_idx on public.ads (slot, active, status);

-- Public only ever sees approved, active creatives.
drop policy if exists "ads: public read active" on public.ads;
create policy "ads: public read active" on public.ads
  for select using (active = true and status = 'approved');

alter table public.articles
  add column if not exists sponsored_by text;

-- ─── Counters (callable by anyone; only increments) ─────────────────────────

create or replace function public.ad_impression(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ads set impressions = impressions + 1 where id = any (p_ids);
$$;

create or replace function public.ad_click(p_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  update public.ads set clicks = clicks + 1 where id = p_id returning target_url;
$$;

revoke all on function public.ad_impression(uuid[]) from public;
revoke all on function public.ad_click(uuid) from public;
grant execute on function public.ad_impression(uuid[]) to anon, authenticated;
grant execute on function public.ad_click(uuid) to anon, authenticated;

-- Approving a revision also carries the sponsor label.
create or replace function public.review_approve(p_article_id uuid)
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
    update public.articles set
      title = coalesce(r.payload ->> 'title', title),
      dek = r.payload ->> 'dek',
      body = coalesce(r.payload -> 'body', body),
      cover_url = r.payload ->> 'cover_url',
      byline = nullif(trim(coalesce(r.payload ->> 'byline', '')), ''),
      sponsored_by = nullif(trim(coalesce(r.payload ->> 'sponsored_by', '')), ''),
      language = coalesce(r.payload ->> 'language', language),
      section_id = coalesce((r.payload ->> 'section_id')::int, section_id)
    where id = p_article_id;
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

  update public.articles
    set status = 'published',
        published_at = coalesce(published_at, now()),
        assigned_editor_id = coalesce(assigned_editor_id, actor)
    where id = p_article_id;

  perform private.notify(
    a.author_id, 'approved', p_article_id,
    'Published: ' || a.title
  );
end;
$$;
