-- =============================================================================
-- Move Digest "News" desk → new "Academics" section, then remove empty News.
-- Reconciles articles + weekly slots so News can be deleted safely.
-- Safe to re-run.
-- =============================================================================

-- 1) Ensure Academics exists (take News position if present)
insert into public.sections (slug, name, position)
values (
  'academics',
  'Academics',
  coalesce((select position from public.sections where slug = 'news' limit 1), 1)
)
on conflict (slug) do update
  set name = excluded.name,
      position = excluded.position;

-- 2) Point every News article at Academics
update public.articles
set section_id = (select id from public.sections where slug = 'academics' limit 1),
    updated_at = now()
where section_id = (select id from public.sections where slug = 'news' limit 1);

-- 3) Weekly issue slots (if table exists)
do $$
begin
  update public.weekly_issue_slots
  set section_id = (select id from public.sections where slug = 'academics' limit 1)
  where section_id = (select id from public.sections where slug = 'news' limit 1);
exception
  when undefined_table then null;
end $$;

-- 4) Drop empty News (now safe — no remaining FKs from articles/slots)
delete from public.sections
where slug = 'news'
  and not exists (
    select 1 from public.articles a
    where a.section_id = sections.id
  );

-- 5) Stable public desk order
update public.sections
set position = case slug
  when 'academics' then 1
  when 'campus' then 2
  when 'sports' then 3
  when 'technology' then 4
  else position
end
where slug in ('academics', 'campus', 'sports', 'technology');
