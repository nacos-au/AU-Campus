-- ============================================================================
-- Newsroom capability expansion
-- Staff (editor/admin) may create articles in any status (direct publish).
-- ============================================================================

drop policy if exists "articles: writers create" on public.articles;

-- Writers insert only drafts/submissions; staff may insert any status (incl. published).
create policy "articles: contributors create" on public.articles
  for insert with check (
    author_id = (select auth.uid())
    and (
      (
        private.my_role() = 'writer'
        and status in ('draft', 'submitted')
      )
      or (
        private.is_staff()
        and status in ('draft', 'submitted', 'published', 'rejected')
      )
    )
  );
