-- Digest weekly issue voice + campus lore (words / fun facts). Safe patterns for re-apply via APPLY_ALL twin.

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

-- ~50 curated words. Re-run safe: skips any word already present (case-insensitive).
insert into public.campus_words (word, definition, example, sort_order)
select v.word, v.definition, v.example, v.sort_order
from (values
  ('Excellence', 'The habit of doing work that could stand next to the best anywhere — not just “good enough for here.”', 'Excellence is rewriting the lab report until the method section could survive peer review.', 1),
  ('Ambition', 'A clear hunger to go further than your current syllabus, ranking, or comfort zone.', 'Ambition is why she applied to the international moot even though no one from her year had tried.', 2),
  ('Discipline', 'Showing up for the hard practice on the days talent alone will not carry you.', 'Discipline is 6 a.m. pitch drills before a 9 a.m. lecture.', 3),
  ('Grit', 'Sustained effort after motivation has already gone home.', 'Grit finishes the last stretch of the thesis when the novelty has worn off.', 4),
  ('Resilience', 'Recovering form after a loss, a fail, or a public miss — then competing again.', 'Resilience is returning to the court the week after a narrow final defeat.', 5),
  ('Integrity', 'Doing the honest thing when nobody is grading you.', 'Integrity is citing the source even when the deadline is brutal.', 6),
  ('Curiosity', 'The itch to ask one more question past the exam mark scheme.', 'Curiosity turns a required reading into a research rabbit hole worth publishing.', 7),
  ('Mastery', 'Deep skill earned by deliberate practice, not by cramming the night before.', 'Mastery is knowing the code base well enough to teach a junior teammate.', 8),
  ('Rigour', 'Exactness in method, argument, and evidence — refusing to hand-wave.', 'Rigour is checking the statistics twice before the poster session.', 9),
  ('Scholarship', 'Serious study that adds to knowledge, not just to a transcript.', 'Scholarship is the student paper that gets cited outside the classroom.', 10),
  ('Innovation', 'A useful new approach — not novelty for its own sake.', 'Innovation is the rice-sorting robot that actually works under contest rules.', 11),
  ('Ingenuity', 'Clever problem-solving with the tools you have, not the lab you wish you had.', 'Ingenuity is improvising a clean experiment when the equipment booking fell through.', 12),
  ('Precision', 'Accuracy in detail: the millimetre, the citation, the free-throw form.', 'Precision is why the engineering drawing passes industry review.', 13),
  ('Clarity', 'Saying or designing something so others can act on it without confusion.', 'Clarity is a presentation a visiting examiner follows without asking you to repeat yourself.', 14),
  ('Eloquence', 'Persuasive, graceful speech or writing that moves a room.', 'Eloquence wins the debate round when the facts alone are not enough.', 15),
  ('Advocacy', 'Speaking up for a person, idea, or community with skill and courage.', 'Advocacy is arguing for better training facilities with data, not only frustration.', 16),
  ('Leadership', 'Taking responsibility for outcomes and lifting others while you compete.', 'Leadership is the captain who trains hardest and still makes time for first-years.', 17),
  ('Stewardship', 'Caring for people, resources, or a reputation as if they were entrusted to you.', 'Stewardship is leaving the lab cleaner — and the club stronger — than you found it.', 18),
  ('Mentorship', 'Guiding someone else’s growth with honesty and patience.', 'Mentorship is the 400-level student who drills the new squad before dawn.', 19),
  ('Camaraderie', 'Trust and friendship forged through shared hard work.', 'Camaraderie is the hostel table that turns into a study war room before finals.', 20),
  ('Collaboration', 'Building something with others that none of you could ship alone.', 'Collaboration is nursing, engineering, and CS sharing one hackathon prototype.', 21),
  ('Accountability', 'Owning your results — wins and misses — without shifting the blame.', 'Accountability is admitting the missed deadline and presenting the recovery plan.', 22),
  ('Initiative', 'Starting the useful thing before anyone assigns it.', 'Initiative is founding the journal club instead of waiting for the department.', 23),
  ('Vision', 'A vivid picture of a better future that guides today’s small choices.', 'Vision is seeing a national title two seasons out and training like it is next week.', 24),
  ('Strategy', 'A deliberate plan that matches limited resources to a hard goal.', 'Strategy is choosing which tournaments build the squad for NPUGA, not every invite.', 25),
  ('Focus', 'Protecting attention from noise so deep work can happen.', 'Focus is silencing group chat during the three-hour studio block.', 26),
  ('Fortitude', 'Calm courage under pressure when the stakes are public.', 'Fortitude is taking the penalty after missing the last one.', 27),
  ('Poise', 'Composed presence when the room — or the scoreboard — is watching.', 'Poise is answering the oral defence question you did not expect.', 28),
  ('Humility', 'Knowing how much you still have to learn, even after a win.', 'Humility is thanking the coach who spotted the flaw you could not see.', 29),
  ('Empathy', 'Understanding another person’s experience well enough to respond wisely.', 'Empathy is redesigning the clinic flow after listening to patients, not only staff.', 30),
  ('Equity', 'Fairness that accounts for different starting lines, not identical treatment alone.', 'Equity is opening lab access hours so work-study students can still compete.', 31),
  ('Citizenship', 'Contributing to the community that makes your ambition possible.', 'Citizenship is volunteering at orientation while still chasing your own goals.', 32),
  ('Ubuntu', 'A southern African idea: I am because we are.', 'Ubuntu is faculties cheering each other when one team reaches the continental stage.', 33),
  ('Merit', 'Recognition earned by performance, not by proximity or noise.', 'Merit is the selection list that matches the timesheet and the tape.', 34),
  ('Legacy', 'What your work leaves behind for the next cohort to stand on.', 'Legacy is the playbook the graduating captain leaves for next year’s side.', 35),
  ('Breakthrough', 'A result that moves past a long-standing limit.', 'Breakthrough is the first AUO paper accepted at that international conference.', 36),
  ('Benchmark', 'A clear standard you measure yourself against — often global.', 'Benchmark is comparing your code runtime to the contest leaders, not only classmates.', 37),
  ('Calibration', 'Adjusting effort and method after honest feedback.', 'Calibration is changing the training load after the sports science review.', 38),
  ('Synthesis', 'Combining ideas from different fields into one stronger whole.', 'Synthesis is a law student using data science to map access-to-justice gaps.', 39),
  ('Analysis', 'Breaking a hard problem into parts you can test and improve.', 'Analysis is filming the serve, then fixing one mechanic at a time.', 40),
  ('Critique', 'Careful evaluation aimed at improvement, not humiliation.', 'Critique is the studio review that makes the next prototype sharper.', 41),
  ('Iteration', 'Improving through repeated cycles of build, test, and refine.', 'Iteration is version twelve of the pitch deck that finally lands the grant.', 42),
  ('Prototype', 'An early working version built to learn fast.', 'Prototype is the weekend model that proves the device before the finals.', 43),
  ('Evidence', 'Facts and data that support a claim under scrutiny.', 'Evidence is the match log that backs the coach’s selection, not rumour.', 44),
  ('Diligence', 'Careful, consistent work over time.', 'Diligence is the clinical hours logged without cutting corners.', 45),
  ('Tenacity', 'Holding the goal when progress is slow and public applause is gone.', 'Tenacity is the third attempt at the professional exam — better prepared.', 46),
  ('Audacity', 'Boldness to attempt work that might outgrow the campus.', 'Audacity is entering the world championship qualifier from a small court in Owo.', 47),
  ('Aspire', 'To aim deliberately at a higher standard.', 'Aspire is treating every interfaculty final as dress rehearsal for the national stage.', 48),
  ('Flourish', 'To grow in skill, character, and impact at the same time.', 'Flourish is the semester you posted personal bests in class and in competition.', 49),
  ('Triumph', 'A hard-won success that cost real preparation.', 'Triumph is the medal that followed months of quiet 5 a.m. sessions.', 50),
  ('Serendipity', 'A happy accident — finding something good when you were not looking for it.', 'Serendipity is the visiting professor who hears your question and opens a lab door.', 51),
  ('Impact', 'A measurable difference your work makes beyond the grade.', 'Impact is the campus tool that other universities copy after your demo day.', 52)
) as v(word, definition, example, sort_order)
where not exists (
  select 1 from public.campus_words w where lower(w.word) = lower(v.word)
);

-- Seed fun facts as Q&A (skip if any already exist)
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
