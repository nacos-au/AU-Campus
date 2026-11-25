-- =============================================================================
-- Digest review: super-admin self-assign/revoke + comment edit/delete.
-- Safe to re-run. Does not change Path A submit for normal editors.
-- =============================================================================

create or replace function public.admin_assign_review_to_me(p_article_id uuid)
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
  if actor is null then
    raise exception 'Not authenticated';
  end if;
  if not private.is_super_admin(actor) then
    raise exception 'Only a super admin can assign review to themselves for testing';
  end if;

  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;

  select * into r from public.article_revisions where article_id = p_article_id;

  if a.status = 'published' and found then
    update public.article_revisions
      set state = 'awaiting_editor',
          assigned_editor_id = actor,
          updated_at = now()
      where article_id = p_article_id;
  else
    if a.status not in ('draft', 'awaiting_editor', 'awaiting_writer', 'scheduled') then
      raise exception 'Cannot assign review in this status';
    end if;
    update public.articles
      set status = 'awaiting_editor',
          assigned_editor_id = actor,
          review_lock_by = null,
          review_lock_at = null,
          updated_at = now()
      where id = p_article_id;
  end if;
end;
$$;

create or replace function public.admin_revoke_self_review_assign(p_article_id uuid)
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
  if actor is null then
    raise exception 'Not authenticated';
  end if;
  if not private.is_super_admin(actor) then
    raise exception 'Only a super admin can revoke a self-assign';
  end if;

  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;

  select * into r from public.article_revisions where article_id = p_article_id;

  if a.status = 'published' and found then
    if r.assigned_editor_id is distinct from actor then
      raise exception 'You are not the assigned editor on this revision';
    end if;
    update public.article_revisions
      set assigned_editor_id = null,
          state = case when state = 'awaiting_editor' then 'draft' else state end,
          updated_at = now()
      where article_id = p_article_id;
  else
    if a.assigned_editor_id is distinct from actor then
      raise exception 'You are not the assigned editor on this piece';
    end if;
    update public.articles
      set assigned_editor_id = null,
          status = case
            when status = 'awaiting_editor' then 'draft'
            else status
          end,
          review_lock_by = null,
          review_lock_at = null,
          updated_at = now()
      where id = p_article_id;
  end if;
end;
$$;

create or replace function public.update_review_comment(
  p_comment_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_review_comments;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;
  select * into c from public.article_review_comments where id = p_comment_id;
  if not found then
    raise exception 'Comment not found';
  end if;
  if c.author_id is distinct from actor then
    raise exception 'Only the comment author can edit it';
  end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'Write a comment';
  end if;
  update public.article_review_comments
    set body = trim(p_body)
    where id = p_comment_id;
end;
$$;

create or replace function public.delete_review_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_review_comments;
  a public.articles;
  assignee uuid;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;
  select * into c from public.article_review_comments where id = p_comment_id;
  if not found then
    raise exception 'Comment not found';
  end if;
  select * into a from public.articles where id = c.article_id;
  assignee := coalesce(
    (select assigned_editor_id from public.article_revisions where article_id = c.article_id),
    a.assigned_editor_id
  );
  if c.author_id is distinct from actor
     and actor is distinct from assignee
     and not private.is_super_admin(actor) then
    raise exception 'Not allowed to remove this comment';
  end if;
  delete from public.article_review_comments where id = p_comment_id;
end;
$$;

revoke all on function public.admin_assign_review_to_me(uuid) from public;
grant execute on function public.admin_assign_review_to_me(uuid) to authenticated;

revoke all on function public.admin_revoke_self_review_assign(uuid) from public;
grant execute on function public.admin_revoke_self_review_assign(uuid) to authenticated;

revoke all on function public.update_review_comment(uuid, text) from public;
grant execute on function public.update_review_comment(uuid, text) to authenticated;

revoke all on function public.delete_review_comment(uuid) from public;
grant execute on function public.delete_review_comment(uuid) to authenticated;

notify pgrst, 'reload schema';
