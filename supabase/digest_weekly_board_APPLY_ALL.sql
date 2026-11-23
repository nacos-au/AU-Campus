-- =============================================================================
-- Digest weekly freeform board: layout jsonb + sample last-week issue.
-- Safe to re-run.
-- =============================================================================

alter table public.weekly_issues
  add column if not exists layout jsonb not null default '{"version":1,"blocks":[],"meta":{}}'::jsonb;

-- Sample previous-week issue (deletable). Skip if a sample already exists.
do $$
declare
  today_lagos date := (now() at time zone 'Africa/Lagos')::date;
  dow int := extract(dow from today_lagos)::int; -- 0=Sun … 6=Sat
  this_monday date;
  prev_monday date;
  sample_title text;
begin
  this_monday := today_lagos - ((dow + 6) % 7);
  prev_monday := this_monday - 7;
  sample_title := 'Sample · Week of ' || to_char(prev_monday, 'Mon DD, YYYY');

  if exists (
    select 1 from public.weekly_issues
    where layout -> 'meta' ->> 'sample' = 'true'
  ) then
    return;
  end if;

  insert into public.weekly_issues (
    week_start,
    title,
    status,
    published_at,
    layout
  ) values (
    prev_monday,
    sample_title,
    'published',
    now(),
    jsonb_build_object(
      'version', 1,
      'meta', jsonb_build_object('sample', true),
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'intro',
          'span', 8,
          'byline', 'From the Desk',
          'body', 'A quieter week on campus — fewer breaking stories, more room to think. This sample issue shows how text, headlines, and story cards can share the page when the news hole is light.'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'text',
          'span', 4,
          'body', 'Use the board to mix letters, explainers, and featured pieces. Drag blocks, change width, and autosave like a draft article.'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'heading',
          'span', 12,
          'text', 'What we are watching'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'text',
          'span', 12,
          'body', 'When there are fewer finished articles, fill the week with voice: an editor letter, a short briefing, a photo, then the stories you do have. Delete this sample anytime from the Weekly admin.'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'divider',
          'span', 12
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'heading',
          'span', 6,
          'text', 'Still in the paper'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'text',
          'span', 6,
          'body', 'Pin real articles into Article or Article stack widgets once you have published copy. Until then, these text blocks stand in so you can judge spacing and tone.'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'spacer',
          'span', 12,
          'size', 'md'
        )
      )
    )
  );
end $$;
