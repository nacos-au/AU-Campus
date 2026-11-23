-- =============================================================================
-- submit_article: unambiguous RPC + sticky editor continuity
-- Safe to re-run. Prefer digest_editor_continuity_APPLY_ALL.sql for full desk rules.
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
