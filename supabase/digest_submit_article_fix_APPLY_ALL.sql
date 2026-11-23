-- =============================================================================
-- Fix: submit_article overload ambiguity
-- PostgREST cannot choose between submit_article(uuid) and
-- submit_article(uuid, uuid default null) when only p_article_id is passed.
-- Keep a single 2-arg function; default null = auto-assign.
-- Safe to re-run.
-- =============================================================================

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
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.author_id is distinct from actor then
    raise exception 'Only the author can submit this article';
  end if;

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
  else
    editor_id := private.pick_least_busy_editor(actor);
  end if;

  if editor_id is null then
    -- Sole editor submitting their own piece: allow self-assign.
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
      'New piece awaiting your review: ' || a.title
    );
  end if;
end;
$$;

revoke all on function public.submit_article(uuid, uuid) from public;
grant execute on function public.submit_article(uuid, uuid) to authenticated;
