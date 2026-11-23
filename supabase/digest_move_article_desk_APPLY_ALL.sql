-- =============================================================================
-- Editors: move article desk (section) without a full revision cycle.
-- Safe to re-run. Apply in Supabase SQL editor if migrations are not auto-applied.
-- =============================================================================

create or replace function public.move_article_desk(
  p_article_id uuid,
  p_section_id int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Not allowed';
  end if;

  if not exists (
    select 1 from public.sections s
    where s.id = p_section_id
      and s.slug in ('academics', 'campus', 'sports', 'technology')
  ) then
    raise exception 'Section must be a public desk';
  end if;

  if not exists (select 1 from public.articles where id = p_article_id) then
    raise exception 'Article not found';
  end if;

  update public.articles
  set section_id = p_section_id,
      updated_at = now()
  where id = p_article_id;

  update public.article_revisions
  set payload = jsonb_set(
        coalesce(payload, '{}'::jsonb),
        '{section_id}',
        to_jsonb(p_section_id),
        true
      ),
      updated_at = now()
  where article_id = p_article_id;
end;
$$;

revoke all on function public.move_article_desk(uuid, int) from public;
grant execute on function public.move_article_desk(uuid, int) to authenticated;
