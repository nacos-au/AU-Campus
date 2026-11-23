-- =============================================================================
-- Digest: sticky editor across needs-changes → resubmit.
-- Keep the same reviewer unless they left the desk (then reassign).
-- Safe to re-run.
-- =============================================================================

create or replace function private.is_assignable_desk_editor(uid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('editor', 'admin')
      and coalesce(p.is_super_admin, false) = false
  );
$$;

drop function if exists public.submit_article(uuid);

create or replace function public.submit_article(
  p_article_id uuid,
  p_editor uuid default null
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
  editor_id uuid;
  sticky uuid;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.author_id is distinct from actor then
    raise exception 'Only the author can submit this article';
  end if;

  -- Continuity: same reviewer who started the cycle (revision or article).
  select coalesce(
    (select assigned_editor_id
       from public.article_revisions
      where article_id = p_article_id
      limit 1),
    a.assigned_editor_id
  ) into sticky;

  if p_editor is not null then
    if not (
      private.is_super_admin(actor)
      or exists (
        select 1 from public.profiles p
        where p.id = actor and p.role = 'admin'
      )
      or exists (
        select 1 from public.app_roles ar
        where ar.user_id = actor and ar.app = 'digest' and ar.role = 'admin'
      )
    ) then
      raise exception 'Only an admin can choose a specific editor';
    end if;
    editor_id := p_editor;
  elsif sticky is not null and private.is_assignable_desk_editor(sticky) then
    -- Same editor continues after needs-changes (and any other resubmit).
    editor_id := sticky;
  else
    editor_id := private.pick_least_busy_editor(actor);
  end if;

  if editor_id is null then
    if private.is_sole_digest_editor(actor) then
      editor_id := actor;
    end if;
  end if;

  if editor_id is null then
    raise exception 'No editor is available to review this article';
  end if;
  if editor_id = actor and not private.is_sole_digest_editor(actor) then
    raise exception 'No other editor is available; ask an admin to appoint one';
  end if;
  if not private.is_digest_editor(editor_id) then
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
      set state = 'awaiting_editor',
          assigned_editor_id = editor_id,
          updated_at = now()
      where article_id = p_article_id;
    -- Keep article.assigned_editor_id in sync for continuity.
    update public.articles
      set assigned_editor_id = editor_id,
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      editor_id, 'review_requested', p_article_id,
      'Edit awaiting your review: ' || a.title
    );
  else
    if a.status not in ('draft', 'awaiting_writer', 'archived') then
      raise exception 'Already with the editor';
    end if;
    if a.status = 'archived' then
      raise exception 'Restore this article from archive before submitting';
    end if;
    update public.articles
      set status = 'awaiting_editor',
          assigned_editor_id = editor_id,
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      editor_id, 'review_requested', p_article_id,
      case
        when a.status = 'awaiting_writer' then 'Revised piece ready for you: ' || a.title
        else 'New piece awaiting your review: ' || a.title
      end
    );
  end if;
end;
$$;

revoke all on function public.submit_article(uuid, uuid) from public;
grant execute on function public.submit_article(uuid, uuid) to authenticated;

-- Demotion: move both in-review and needs-changes work off the old editor.
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
    select id, title, status from public.articles
    where assigned_editor_id = p_from
      and status in ('awaiting_editor', 'awaiting_writer')
  loop
    if next_editor is null then
      update public.articles
        set assigned_editor_id = null,
            review_lock_by = null,
            review_lock_at = null,
            updated_at = now()
        where id = a.id;
    else
      update public.articles
        set assigned_editor_id = next_editor,
            review_lock_by = null,
            review_lock_at = null,
            updated_at = now()
        where id = a.id;
      if a.status = 'awaiting_editor' then
        perform private.notify(
          next_editor, 'review_requested', a.id,
          'Reassigned to you: ' || a.title
        );
      end if;
    end if;
    moved := moved + 1;
  end loop;

  update public.article_revisions r
  set assigned_editor_id = next_editor,
      updated_at = now()
  where r.assigned_editor_id = p_from
    and r.state in ('awaiting_editor', 'awaiting_writer');

  return moved;
end;
$$;

-- Ensure request-changes keeps the assignee (explicit for clarity).
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

  select * into r from public.article_revisions
    where article_id = p_article_id and state = 'awaiting_editor';

  if found then
    assignee := r.assigned_editor_id;
  else
    assignee := a.assigned_editor_id;
  end if;

  if actor is distinct from assignee then
    raise exception 'Only the assigned editor can request changes';
  end if;
  -- Sole-editor self-review is allowed; otherwise author cannot request changes on self.
  if actor = a.author_id and not private.is_sole_digest_editor(actor) then
    raise exception 'Only the assigned editor can request changes';
  end if;

  if found then
    update public.article_revisions
      set state = 'awaiting_writer',
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          updated_at = now()
      where article_id = p_article_id;
    update public.articles
      set assigned_editor_id = coalesce(assigned_editor_id, actor),
          updated_at = now()
      where id = p_article_id;
  elsif a.status = 'awaiting_editor' then
    update public.articles
      set status = 'awaiting_writer',
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          review_lock_by = null,
          review_lock_at = null,
          updated_at = now()
      where id = p_article_id;
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

revoke all on function public.review_request_changes(uuid, text) from public;
grant execute on function public.review_request_changes(uuid, text) to authenticated;
