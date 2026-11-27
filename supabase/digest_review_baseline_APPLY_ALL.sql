-- =============================================================================
-- Digest: remember what the editor reviewed when a piece is sent back.
-- The feedback page diffs the writer's revised copy against this snapshot so
-- editors see exactly what changed. Safe to re-run.
-- Needs digest_versions (article_versions, private.snapshot_article,
-- private.record_article_version) — apply digest_versions_cron_APPLY_ALL.sql first.
-- =============================================================================

create or replace function private.record_sent_back_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_article_version(
    old.id,
    private.snapshot_article(old),
    'Sent back to writer',
    auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists articles_record_sent_back on public.articles;

create trigger articles_record_sent_back
  after update of status on public.articles
  for each row
  when (new.status = 'awaiting_writer' and old.status is distinct from 'awaiting_writer')
  execute function private.record_sent_back_snapshot();
