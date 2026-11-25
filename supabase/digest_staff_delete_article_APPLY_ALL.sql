-- =============================================================================
-- Digest: staff can permanently delete any article (mock cleanup).
-- Authors keep draft-only delete via RLS. Safe to re-run.
-- =============================================================================

create or replace function public.delete_article(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;

  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;

  if private.is_digest_editor(actor) then
    null; -- staff may delete any piece
  elsif a.author_id = actor and a.status = 'draft' then
    null; -- author may delete own draft
  else
    raise exception 'You cannot delete this article';
  end if;

  -- weekly_issue_slots references articles with ON DELETE RESTRICT
  delete from public.weekly_issue_slots where article_id = p_article_id;
  delete from public.front_page_slots where article_id = p_article_id;
  delete from public.article_revisions where article_id = p_article_id;
  delete from public.article_review_comments where article_id = p_article_id;
  delete from public.articles where id = p_article_id;
end;
$$;

revoke all on function public.delete_article(uuid) from public;
grant execute on function public.delete_article(uuid) to authenticated;
