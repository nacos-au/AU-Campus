-- =============================================================================
-- Digest: remove the sample weekly issue so the first real issue is Vol. I, No. 1.
--
-- The old "Create sample week" button published an issue titled "Sample · Week
-- of …" (layout meta.sample = true) for the previous Monday. It counted toward
-- issue numbering, which pushed the first real issue to No. 2.
--
-- Safe to re-run. Only rows that are clearly the sample are deleted; their
-- weekly_issue_slots rows go with them (on delete cascade).
-- =============================================================================

-- 1. Preview: every issue, with the ones this script will delete flagged.
select id,
       publish_date,
       week_start,
       status,
       title,
       (title ilike 'sample%' or layout->'meta'->>'sample' = 'true') as will_delete
  from public.weekly_issues
 order by coalesce(publish_date, week_start);

-- 2. Delete the sample issue(s).
delete from public.weekly_issues
 where title ilike 'sample%'
    or layout->'meta'->>'sample' = 'true';

-- 3. Check: what remains.
select id, publish_date, status, title
  from public.weekly_issues
 order by coalesce(publish_date, week_start);
