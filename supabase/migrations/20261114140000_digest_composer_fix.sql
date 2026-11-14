-- private schema grants, remove Opinion/Culture/Science, equal editor assign
-- (mirrors digest_composer_fix_APPLY_ALL.sql)

grant usage on schema private to authenticated, anon, service_role;

update public.articles
set section_id = (select id from public.sections where slug = 'news' limit 1)
where section_id in (
  select id from public.sections where slug in ('opinion', 'culture', 'science')
);

do $$
begin
  update public.weekly_issue_slots
  set section_id = (select id from public.sections where slug = 'news' limit 1)
  where section_id in (
    select id from public.sections where slug in ('opinion', 'culture', 'science')
  );
exception
  when undefined_table then null;
end $$;

delete from public.sections
where slug in ('opinion', 'culture', 'science');

update public.sections
set position = case slug
  when 'news' then 1
  when 'campus' then 2
  when 'sports' then 3
  else position
end
where slug in ('news', 'campus', 'sports');

create or replace function private.pick_least_busy_editor(exclude_uid uuid default null)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select p.id
  from public.profiles p
  where (
      p.role in ('editor', 'admin')
      or coalesce(p.is_super_admin, false)
    )
    and (exclude_uid is null or p.id is distinct from exclude_uid)
  order by (
    select count(*)::int
    from public.articles a
    where a.assigned_editor_id = p.id
      and a.status = 'awaiting_editor'
  ) asc,
  (
    select count(*)::int
    from public.article_revisions r
    where r.assigned_editor_id = p.id
      and r.state = 'awaiting_editor'
  ) asc,
  random()
  limit 1;
$$;

revoke all on function private.pick_least_busy_editor(uuid) from public;

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
    if not private.is_super_admin(actor) then
      raise exception 'Only a super admin can choose a specific editor';
    end if;
    editor_id := p_editor;
  else
    editor_id := private.pick_least_busy_editor(actor);
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
    if a.status not in ('draft', 'awaiting_writer') then
      raise exception 'Already with the editor';
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

create or replace function public.submit_article(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.submit_article(p_article_id, null);
end;
$$;

revoke all on function public.submit_article(uuid) from public;
grant execute on function public.submit_article(uuid) to authenticated;
