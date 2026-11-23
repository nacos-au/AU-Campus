-- =============================================================================
-- Digest weekly issue enrich: intro/teasers + campus words + fun facts.
-- Safe to re-run in the Supabase SQL editor.
-- =============================================================================

alter table public.weekly_issues
  add column if not exists intro text,
  add column if not exists intro_byline text;

alter table public.weekly_issue_slots
  add column if not exists teaser text;

create table if not exists public.campus_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  definition text not null,
  example text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campus_words_active_sort_idx
  on public.campus_words (active, sort_order, created_at);

create table if not exists public.campus_facts (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campus_facts_active_sort_idx
  on public.campus_facts (active, sort_order, created_at);

alter table public.campus_words enable row level security;
alter table public.campus_facts enable row level security;

drop policy if exists "campus_words: public read active" on public.campus_words;
create policy "campus_words: public read active" on public.campus_words
  for select using (active = true or private.is_digest_editor());

drop policy if exists "campus_words: editors manage" on public.campus_words;
create policy "campus_words: editors manage" on public.campus_words
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

drop policy if exists "campus_facts: public read active" on public.campus_facts;
create policy "campus_facts: public read active" on public.campus_facts
  for select using (active = true or private.is_digest_editor());

drop policy if exists "campus_facts: editors manage" on public.campus_facts;
create policy "campus_facts: editors manage" on public.campus_facts
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

insert into public.campus_words (word, definition, example, sort_order)
select * from (values
  ('Serendipity', 'A happy accident — finding something good when you were not looking for it.', 'Finding an empty seat in the library at peak hour felt like serendipity.', 1),
  ('Camaraderie', 'Friendship and trust among people who share a struggle or a team.', 'Hostel camaraderie gets you through exams and midnight power cuts.', 2),
  ('Resilience', 'The habit of bouncing back after a hard day, a loss, or a tough paper.', 'Campus sport teaches resilience as much as technique.', 3),
  ('Curiosity', 'The itch to ask one more question.', 'Curiosity is how a boring lecture becomes a research rabbit hole.', 4),
  ('Integrity', 'Doing the honest thing when nobody is grading you.', 'Integrity is citing the source even when the deadline is brutal.', 5),
  ('Grit', 'Sustained effort when motivation has already gone home.', 'Grit finishes the last 400m of the assignment sprint.', 6),
  ('Ubuntu', 'A southern African idea: I am because we are.', 'Ubuntu shows up when faculties cheer each other at interfaculty finals.', 7)
) as v(word, definition, example, sort_order)
where not exists (select 1 from public.campus_words limit 1);

insert into public.campus_facts (question, answer, sort_order)
select * from (values
  (
    'Where did Achievers begin before the Owo campus?',
    'As a 1991 coaching centre in Ibadan — so students would not have to trek to Lagos every weekend just to sit banking exams. The university in Owo came later.',
    1
  ),
  (
    'How “family business” did the ownership story stay?',
    'Not for long. What started as a family project grew through a private placement to about 90 shareholders — including figures like Chief (Mrs.) Olutoyin Olakunri and Senator T.O. Olupitan.',
    2
  ),
  (
    'How small was the pioneer class — and what first did Achievers claim?',
    'Doors opened in 2008 with about 126 students. Achievers became the first private university in the old Ondo State region (today’s Ondo and Ekiti).',
    3
  ),
  (
    'What HND pathway did Achievers help normalise in Nigeria?',
    'In 2011 it launched a dedicated “Top-Up” conversion route for HND graduates (AUFAP) — among the first private-university versions of a model later seen nationwide.',
    4
  ),
  (
    'What happened to the school’s licence in July 2012?',
    'The NUC briefly suspended Achievers’ operating licence with six other private universities during a nationwide quality check — then restored it on 17 July after a rapid inspection. Short scare, long memory.',
    5
  ),
  (
    'How many hometowns sit under the campus footprint?',
    'The grounds span land historically tied to six Idasen communities in Owo: Ulale 1, Ulale 11, Ulema, Ijegunma, Isijogun, and Amurin Elegba. You are studying on a patchwork of hometowns.',
    6
  ),
  (
    'Do faculties get graded against each other?',
    'Yes — the proprietors run an internal College/Faculty Rating Board for academics and discipline. Your college has a report card too.',
    7
  )
) as v(question, answer, sort_order)
where not exists (select 1 from public.campus_facts limit 1);

grant select on public.campus_words to anon, authenticated;
grant select, insert, update, delete on public.campus_words to authenticated;
grant select on public.campus_facts to anon, authenticated;
grant select, insert, update, delete on public.campus_facts to authenticated;
