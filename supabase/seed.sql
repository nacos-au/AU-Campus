-- ============================================================================
-- Demo seed data — LOCAL DEVELOPMENT ONLY.
-- NOT re-runnable and NEVER run this on the hosted Supabase project.
-- To remove these demo accounts from a hosted project, use
-- supabase/digest_delete_mock_users_APPLY_ALL.sql instead.
--
-- Accounts (password for all: password123):
--   admin@demo.test   → admin
--   editor@demo.test  → editor
--   writer@demo.test  → writer
--   reader@demo.test  → reader
-- ============================================================================

-- Fail fast with a clear message instead of a cryptic duplicate-key error.
do $$
begin
  if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'Seed already applied. seed.sql is local-only and not re-runnable.';
  end if;
end
$$;

-- ─── Demo auth users ────────────────────────────────────────────────────────
-- Token columns are set to '' (not NULL) so the Auth service / dashboard can load them.

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@demo.test',
   extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Ada Obi"}', now(), now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'editor@demo.test',
   extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Emeka Eze"}', now(), now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'writer@demo.test',
   extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Wale Adeyemi"}', now(), now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'reader@demo.test',
   extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Rita Okon"}', now(), now(),
   '', '', '', '');

insert into auth.identities
  (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), id, id,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users where email like '%@demo.test';

update public.profiles set role = 'admin'  where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'editor' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set role = 'writer' where id = '00000000-0000-0000-0000-000000000003';

-- ─── Sections ───────────────────────────────────────────────────────────────

insert into public.sections (slug, name, position) values
  ('news', 'News', 1),
  ('campus', 'Campus Life', 2),
  ('sports', 'Sports', 3);

-- ─── Articles ───────────────────────────────────────────────────────────────

create or replace function pg_temp.seed_body(paras text[])
returns jsonb language sql as $$
  select jsonb_build_object(
    'type', 'doc',
    'content', (
      select jsonb_agg(jsonb_build_object(
        'type', 'paragraph',
        'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p))
      ))
      from unnest(paras) as p
    )
  );
$$;

insert into public.articles
  (slug, title, dek, body, cover_url, section_id, author_id, status, featured, published_at)
values
  ('senate-approves-new-engineering-faculty',
   'University Senate Approves Landmark Engineering Faculty Expansion',
   'The decision, three years in the making, will double laboratory capacity and add four new degree programmes by next session.',
   pg_temp.seed_body(array[
     'The University Senate voted overwhelmingly on Tuesday to approve the largest expansion of the Faculty of Engineering in the institution''s history, committing funds to double laboratory capacity and introduce four new degree programmes.',
     'The expansion, first proposed three years ago, faced repeated delays over funding disputes and site allocation. Under the approved plan, construction of two new laboratory complexes will begin before the end of the semester.',
     'Vice-Chancellor''s office sources confirmed that the programmes — mechatronics, petroleum engineering, biomedical engineering and software engineering — will admit their first cohorts next academic session.',
     '"This is the single most consequential academic investment we have made in a decade," the Dean of Engineering said at a press briefing, adding that partnerships with industry sponsors would cover roughly a third of the projected costs.']),
   'https://picsum.photos/seed/engineering/1200/800',
   (select id from public.sections where slug = 'news'),
   '00000000-0000-0000-0000-000000000003', 'published', true, now() - interval '2 hours'),

  ('hostel-allocation-reforms-announced',
   'Hostel Allocation Goes Fully Digital After Years of Complaints',
   'Student Affairs says the new portal will end the overnight queues that have defined allocation week for a generation of students.',
   pg_temp.seed_body(array[
     'The Division of Student Affairs has announced that hostel allocation will move entirely online from next session, ending the overnight queues that have long defined the start of every academic year.',
     'Under the new system, students will select rooms through a portal that opens in ranked windows determined by level and academic standing. Payment integrates directly with the bursary.',
     'Student union representatives cautiously welcomed the change but demanded a public audit of room inventory before the portal launches.']),
   'https://picsum.photos/seed/hostel/1200/800',
   (select id from public.sections where slug = 'campus'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '5 hours'),

  ('falcons-clinch-inter-university-cup',
   'Falcons Clinch Inter-University Cup in Penalty Thriller',
   'A save in sudden death sealed the university''s first football title in eleven years before a record home crowd.',
   pg_temp.seed_body(array[
     'The university''s football team ended an eleven-year wait for silverware on Saturday, defeating their oldest rivals 4-3 on penalties after a tense goalless final.',
     'Goalkeeper and final-year physiology student Chuka Nwosu produced the decisive save in sudden death, sparking a pitch invasion from a record home crowd of over eight thousand.',
     'The team returns to campus on Monday, when the Vice-Chancellor is expected to receive the squad at the main auditorium.']),
   'https://picsum.photos/seed/football/1200/800',
   (select id from public.sections where slug = 'sports'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '8 hours'),

  ('the-case-for-a-24-hour-library',
   'The Case for a 24-Hour Library',
   'If the university is serious about research output, it should start by unlocking its own front door.',
   pg_temp.seed_body(array[
     'Every examination season, the same scene repeats itself: students crowded under walkway lights at midnight, reading where the mosquitoes are because the library closed at ten.',
     'The arguments against a 24-hour library — staffing costs, security, electricity — are real but solvable, and other institutions of comparable size solved them years ago.',
     'A university that asks for world-class output must provide world-class access. The books should not sleep before the students do.']),
   'https://picsum.photos/seed/library/1200/800',
   (select id from public.sections where slug = 'news'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '1 day'),

  ('theatre-arts-stages-wole-soyinka-classic',
   'Theatre Arts Stages a Daring Revival of ''Death and the King''s Horseman''',
   'The department''s ambitious production trades period costume for contemporary dress — and divides its audience.',
   pg_temp.seed_body(array[
     'The Department of Theatre Arts opened its season on Friday with a revival of Wole Soyinka''s ''Death and the King''s Horseman'' that relocates the play to the present day.',
     'Director and final-year student Ifeoma Chukwu defended the choice, arguing the play''s questions about duty and interference have never been contemporary costume away from relevance.',
     'The production runs for two more weekends at the Arts Theatre, with proceeds funding the department''s touring programme.']),
   'https://picsum.photos/seed/theatre/1200/800',
   (select id from public.sections where slug = 'campus'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '1 day 4 hours'),

  ('robotics-club-wins-national-competition',
   'Robotics Club Wins National Competition With Rice-Sorting Machine',
   'The winning build sorts and grades rice grains using a camera and a neural network trained in a hostel room.',
   pg_temp.seed_body(array[
     'The university robotics club took first place at the national engineering innovation competition with a machine that sorts and grades rice grains in real time.',
     'The system pairs a conveyor, a camera and a neural network the team trained on a dataset they photographed themselves over six weeks in a hostel room.',
     'The team received a cash prize and an incubation offer, and says a field version for rice mills is already in design.']),
   'https://picsum.photos/seed/robotics/1200/800',
   (select id from public.sections where slug = 'sports'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '2 days'),

  ('convocation-week-what-to-expect',
   'Convocation Week: Everything You Need to Know',
   'Road closures, gown collection windows, guest limits and the full ceremony timetable, gathered in one place.',
   pg_temp.seed_body(array[
     'Convocation week begins Monday, and with it the annual transformation of the campus: marquees on the cricket oval, road closures around the main gate, and a strict schedule of gown collection windows.',
     'Graduands are advised to collect gowns from the Great Hall annex between 9 a.m. and 4 p.m., with faculties assigned specific days to reduce queues.',
     'Each graduand receives two guest passes for the main ceremony. The overflow arena will carry a live broadcast on both days.']),
   'https://picsum.photos/seed/convocation/1200/800',
   (select id from public.sections where slug = 'campus'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '2 days 6 hours'),

  ('new-shuttle-routes-review',
   'The New Shuttle Routes, Reviewed by the People Who Ride Them',
   'Two weeks in, students say the expanded loop saves time — unless you live past the science complex.',
   pg_temp.seed_body(array[
     'Two weeks after the transport unit redrew the campus shuttle map, opinion among riders has settled into a clear pattern: the expanded loop is faster for most, and slower for an unlucky few.',
     'Students living past the science complex report waits of up to twenty-five minutes at peak hours, as buses fill before reaching the last stops.',
     'The transport unit says it is reviewing ridership data and will adjust frequencies before examinations begin.']),
   'https://picsum.photos/seed/shuttle/1200/800',
   (select id from public.sections where slug = 'news'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '3 days'),

  ('grading-transparency-editorial',
   'Grades Should Not Be a Mystery',
   'Departments that publish marking rubrics report fewer disputes. The rest should follow.',
   pg_temp.seed_body(array[
     'A student who receives a 58 deserves to know why it was not a 62. That is not entitlement; it is the basic feedback loop on which all learning depends.',
     'The handful of departments that publish marking rubrics report fewer grade disputes, not more. Transparency, it turns out, is cheaper than arbitration.',
     'The Senate should make rubric publication university policy before the next examination cycle.']),
   'https://picsum.photos/seed/grading/1200/800',
   (select id from public.sections where slug = 'news'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '3 days 8 hours'),

  ('campus-food-prices-investigation',
   'Inside the Quiet Rise of Cafeteria Prices',
   'A plate of rice has risen forty percent in a session. We traced where the money goes.',
   pg_temp.seed_body(array[
     'The price of a standard plate of rice at the central cafeteria has risen forty percent in a single session, outpacing both national food inflation and the vendors'' stated costs.',
     'Interviews with eleven vendors point to a stack of pressures: new stall levies, generator fuel, and a single supplier controlling wholesale delivery to campus.',
     'The student union has petitioned for a price review board with student representation; management says a response is coming "shortly".']),
   'https://picsum.photos/seed/cafeteria/1200/800',
   (select id from public.sections where slug = 'news'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '4 days'),

  ('afrobeats-society-year-in-music',
   'The Campus Year in Music, According to the Afrobeats Society',
   'From open-mic discoveries to the songs that soundtracked exam season, a definitive and argumentative list.',
   pg_temp.seed_body(array[
     'The Afrobeats Society has published its annual and gleefully argumentative ranking of the campus year in music, drawn from open-mic nights, hall parties and the unofficial exam-season playlists.',
     'Topping the list is a final-year economics student whose recording, made in a borrowed studio session, has crossed a million streams.',
     'The society''s end-of-year concert holds on the last Friday of the semester at the amphitheatre.']),
   'https://picsum.photos/seed/music/1200/800',
   (select id from public.sections where slug = 'campus'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '4 days 12 hours'),

  ('solar-microgrid-pilot',
   'Physics Department Pilots Solar Microgrid for Laboratory Block',
   'The pilot aims to end the generator lottery that decides whether practicals hold.',
   pg_temp.seed_body(array[
     'The Department of Physics has switched on a pilot solar microgrid serving its main laboratory block, a first for the university and a possible template for the wider campus.',
     'The installation pairs rooftop panels with battery storage sized to carry afternoon practical sessions through grid outages.',
     'If the pilot holds through the rainy season, the works department says the design will be costed for the library and the teaching hospital annex.']),
   'https://picsum.photos/seed/solar/1200/800',
   (select id from public.sections where slug = 'sports'),
   '00000000-0000-0000-0000-000000000003', 'published', false, now() - interval '5 days');

-- One draft and one submitted article so the CMS queues aren't empty.
insert into public.articles (slug, title, dek, body, section_id, author_id, status)
values
  ('draft-exam-timetable-analysis', 'Exam Timetable Analysis (Draft)',
   'Working draft — do not publish.',
   pg_temp.seed_body(array['Notes and interviews pending.']),
   (select id from public.sections where slug = 'news'),
   '00000000-0000-0000-0000-000000000003', 'draft'),
  ('submitted-hall-week-preview', 'Hall Week Preview: What Each Hall Is Planning',
   'A hall-by-hall guide to the biggest social week of the semester.',
   pg_temp.seed_body(array['Every hall has confirmed its lineup for hall week, and the rivalry is already spilling onto notice boards.']),
   (select id from public.sections where slug = 'campus'),
   '00000000-0000-0000-0000-000000000003', 'submitted');

-- ─── Editions ───────────────────────────────────────────────────────────────

insert into public.editions (id, title, description, cover_url, issue_date, price_kobo, published)
values
  ('10000000-0000-0000-0000-000000000001',
   'Vol. 12, No. 4 — Convocation Special',
   'A 24-page special edition covering convocation week: the honorary degree list, a decade of graduating-class data, and the photo essay of the year.',
   'https://picsum.photos/seed/edition1/800/1100', current_date - 7, 50000, true),
  ('10000000-0000-0000-0000-000000000002',
   'Vol. 12, No. 3 — The Housing Issue',
   'Our investigation into hostel allocation, the full shuttle-route review, and an interview with the outgoing union president.',
   'https://picsum.photos/seed/edition2/800/1100', current_date - 30, 50000, true);

-- NOTE: PDF files must be uploaded via the admin dashboard (Admin → Editions).
-- Editions without a file show as "coming soon" in the reader.

-- ─── Ads ────────────────────────────────────────────────────────────────────

insert into public.ads (slot, image_url, target_url, label, active) values
  ('leaderboard', 'https://picsum.photos/seed/adlead/970/250',  'https://example.com', 'Campus Bookshop — New Session Sale', true),
  ('sidebar',     'https://picsum.photos/seed/adside/300/600',  'https://example.com', 'Faculty of Law — LLM Admissions Open', true),
  ('infeed',      'https://picsum.photos/seed/adfeed/600/400',  'https://example.com', 'Student Union Health Week', true);
