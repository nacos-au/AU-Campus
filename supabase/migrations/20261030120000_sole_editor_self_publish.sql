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
