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

create policy "talent: public read published" on public.talent_spotlights
  for select using (published = true);

create policy "talent: editors read all" on public.talent_spotlights
  for select using (private.is_digest_editor());

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
create policy "forum_categories: members read" on public.forum_categories
  for select using (private.is_forum_member());

create policy "forum_categories: editors manage" on public.forum_categories
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

create policy "forum_threads: members read visible" on public.forum_threads
  for select using (status = 'visible' and private.is_forum_member());

create policy "forum_threads: editors read all" on public.forum_threads
  for select using (private.is_digest_editor());

create policy "forum_posts: members read visible" on public.forum_posts
  for select using (
    status = 'visible'
    and private.is_forum_member()
    and exists (
      select 1 from public.forum_threads t
      where t.id = thread_id and t.status = 'visible'
    )
  );

create policy "forum_posts: editors read all" on public.forum_posts
  for select using (private.is_digest_editor());

create policy "forum_votes: read own" on public.forum_votes
  for select using (user_id = (select auth.uid()));

create policy "forum_reports: editors read" on public.forum_reports
  for select using (private.is_digest_editor());

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
