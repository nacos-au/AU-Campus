-- =============================================================================
-- Digest: withdraw returns the piece to draft and keeps the writing.
-- Still pulls it from the editor queue, clears review comments/revisions,
-- and notifies the assigned editor. Safe to re-run.
-- =============================================================================

create or replace function public.withdraw_article(
  p_article_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  lock_active boolean;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then raise exception 'Article not found'; end if;
  if a.author_id is distinct from actor then
    raise exception 'Only the author can withdraw this article';
  end if;
  if a.status not in ('awaiting_editor', 'awaiting_writer') then
    raise exception 'Only pieces in review can be withdrawn';
  end if;

  lock_active :=
    a.review_lock_by is not null
    and a.review_lock_by is distinct from actor
    and a.review_lock_at is not null
    and a.review_lock_at >= now() - interval '30 minutes';

  if lock_active then
    raise exception 'Editor is reviewing this piece — ask them to release it, or wait until the review lock expires';
  end if;

  insert into public.article_audit (
    article_id, title, slug, author_id, assigned_editor_id, actor_id, action, reason
  ) values (
    a.id, a.title, a.slug, a.author_id, a.assigned_editor_id, actor, 'withdrawn',
    nullif(trim(coalesce(p_reason, '')), '')
  );

  if a.assigned_editor_id is not null and a.assigned_editor_id is distinct from actor then
    perform private.notify(
      a.assigned_editor_id,
      'article_withdrawn',
      a.id,
      'Withdrawn by author: ' || a.title
    );
  end if;

  delete from public.article_revisions where article_id = a.id;
  delete from public.article_review_comments where article_id = a.id;

  -- Keep body / dek / cover so the author can edit and resubmit.
  update public.articles
  set status = 'draft',
      featured = false,
      breaking = false,
      editor_note = null,
      assigned_editor_id = null,
      review_lock_by = null,
      review_lock_at = null,
      updated_at = now()
  where id = a.id;

  delete from public.front_page_slots where article_id = a.id;
end;
$$;

revoke all on function public.withdraw_article(uuid, text) from public;
grant execute on function public.withdraw_article(uuid, text) to authenticated;
