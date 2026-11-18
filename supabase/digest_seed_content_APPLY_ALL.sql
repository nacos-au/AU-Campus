-- =============================================================================
-- AUSA Digest — seed sections + published articles (from former demo fixtures)
-- Idempotent. Requires ≥1 row in public.profiles (sign up once first).
-- Deletable later: DELETE FROM articles WHERE slug LIKE ... / sections by slug.
-- =============================================================================

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS breaking boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS articles_breaking_idx
  ON public.articles (breaking)
  WHERE breaking = true AND status = 'published';

-- Sections
INSERT INTO public.sections (slug, name, position) VALUES
  ('news', 'News', 1),
  ('campus', 'Campus Life', 2),
  ('sports', 'Sports', 3),
  ('technology', 'Technology', 4)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position;

UPDATE public.sections SET position = position + 100
WHERE slug NOT IN ('news','campus','sports','technology');

DO $$
DECLARE
  v_author uuid;
  v_section int;
BEGIN
  SELECT id INTO v_author FROM public.profiles ORDER BY created_at NULLS LAST, id LIMIT 1;
  IF v_author IS NULL THEN
    RAISE EXCEPTION 'No profiles yet — create an account once, then re-run this seed.';
  END IF;

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'senate-approves-new-engineering-faculty',
    'University Senate Approves Landmark Engineering Faculty Expansion',
    'The decision, three years in the making, will double laboratory capacity and add four new degree programmes by next session.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The University Senate voted overwhelmingly on Tuesday to approve the largest expansion of the Faculty of Engineering in the institution''s history, committing funds to double laboratory capacity and introduce four new degree programmes."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The expansion, first proposed three years ago, faced repeated delays over funding disputes and site allocation. Under the approved plan, construction of two new laboratory complexes will begin before the end of the semester, with the first phase scheduled for commissioning within eighteen months."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Sources in the Vice-Chancellor''s office confirmed that the new programmes â mechatronics, petroleum engineering, biomedical engineering and software engineering â will admit their first cohorts next academic session, pending final accreditation."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "“This is the single most consequential academic investment we have made in a decade,” the Dean of Engineering said at a press briefing on Wednesday, adding that partnerships with three industry sponsors would cover roughly a third of the projected costs."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Student reaction has been broadly positive, though union representatives cautioned that tuition for the new programmes must remain within reach of ordinary families. A fee schedule is expected before admissions open."}]}]}'::jsonb,
    'https://picsum.photos/seed/engineering/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    true,
    true,
    now() - interval '2 hours',
    now() - interval '2 hours',
    now() - interval '2 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'campus-food-prices-investigation',
    'Inside the Quiet Rise of Cafeteria Prices',
    'A plate of rice has risen forty percent in a session. We traced where the money goes.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The price of a standard plate of rice at the central cafeteria has risen forty percent in a single session, outpacing both national food inflation and the vendors'' own stated costs. Over six weeks, this paper collected receipts, interviewed vendors and reviewed the catering unit''s levy schedule to understand why."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Interviews with eleven vendors point to a stack of pressures: new stall levies introduced in January, generator fuel during the long March outages, and a single supplier who now controls wholesale delivery to campus after two competitors lost their permits."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The supplier, whose permit renewal was approved in a closed session of the works committee, declined repeated requests for comment. Committee minutes obtained by this paper show the renewal passed without competitive bidding."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The student union has petitioned for a price review board with student representation. Management says a response is coming “shortly”. Until then, the queue at the back gate''s informal food stalls grows longer every week."}]}]}'::jsonb,
    'https://picsum.photos/seed/cafeteria/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    true,
    now() - interval '5 hours',
    now() - interval '5 hours',
    now() - interval '5 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'new-shuttle-routes-review',
    'The New Shuttle Routes, Reviewed by the People Who Ride Them',
    'Two weeks in, students say the expanded loop saves time â unless you live past the science complex.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Two weeks after the transport unit redrew the campus shuttle map, opinion among riders has settled into a clear pattern: the expanded loop is faster for most, and slower for an unlucky few."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Students living past the science complex report waits of up to twenty-five minutes at peak hours, as buses fill before reaching the last stops. “By the time it gets to us, it''s standing room only or it doesn''t stop at all,” said a final-year microbiology student."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The transport unit says it is reviewing ridership data and will adjust frequencies before examinations begin. An additional bus, donated by an alumni association, enters service next month."}]}]}'::jsonb,
    'https://picsum.photos/seed/shuttle/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    true,
    false,
    now() - interval '9 hours',
    now() - interval '9 hours',
    now() - interval '9 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'library-extends-exam-hours',
    'Library Extends Opening Hours to Midnight for Exam Season',
    'A pilot programme adds four reading halls and two hundred seats to the evening shift.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The university library will remain open until midnight throughout the examination period, the University Librarian announced on Monday, in a pilot that answers one of the student union''s longest-running demands."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Four reading halls will run on the extended schedule, adding roughly two hundred seats to the evening shift. Security escorts to the hostels will operate on the half hour after 10 p.m."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "If the pilot passes review â measured by attendance and incident reports â the extended hours could become permanent next session. Union officials are already pushing for a full 24-hour schedule."}]}]}'::jsonb,
    'https://picsum.photos/seed/library-night/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    true,
    false,
    now() - interval '14 hours',
    now() - interval '14 hours',
    now() - interval '14 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'alumni-endow-scholarship-fund',
    'Class of ''02 Endows â¦120 Million Scholarship Fund',
    'The gift, the largest single alumni donation on record, will fully fund forty indigent students a year.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The graduating class of 2002 marked its reunion with the largest single alumni donation in the university''s history: a â¦120 million endowment that will fully fund forty indigent students each year, covering tuition, accommodation and a book allowance."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The fund will be administered by the scholarships board with two alumni trustees, and applications open at the start of next session. Selection will weigh financial need alongside academic standing."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "“Many of us nearly didn''t finish,” the class representative said at the signing ceremony. “This is us holding the door open behind us.”"}]}]}'::jsonb,
    'https://picsum.photos/seed/scholarship/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    true,
    false,
    now() - interval '20 hours',
    now() - interval '20 hours',
    now() - interval '20 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'hostel-allocation-reforms-announced',
    'Hostel Allocation Goes Fully Digital After Years of Complaints',
    'Student Affairs says the new portal will end the overnight queues that have defined allocation week for a generation of students.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The Division of Student Affairs has announced that hostel allocation will move entirely online from next session, ending the overnight queues that have long defined the start of every academic year."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Under the new system, students will select rooms through a portal that opens in ranked windows determined by level and academic standing. Payment integrates directly with the bursary, and allocation letters arrive by email within the hour."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Student union representatives cautiously welcomed the change but demanded a public audit of room inventory before the portal launches, citing years of “missing” rooms that later surfaced under informal arrangements."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "A pilot run with two halls last month processed four hundred allocations in a day without incident, according to the unit''s programme officer."}]}]}'::jsonb,
    'https://picsum.photos/seed/hostel/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    true,
    now() - interval '4 hours',
    now() - interval '4 hours',
    now() - interval '4 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'convocation-week-what-to-expect',
    'Convocation Week: Everything You Need to Know',
    'Road closures, gown collection windows, guest limits and the full ceremony timetable, gathered in one place.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Convocation week begins Monday, and with it the annual transformation of the campus: marquees on the cricket oval, road closures around the main gate, and a strict schedule of gown collection windows."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Graduands are advised to collect gowns from the Great Hall annex between 9 a.m. and 4 p.m., with faculties assigned specific days to reduce queues. A valid student ID and clearance slip are required; proxies are not accepted."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Each graduand receives two guest passes for the main ceremony. The overflow arena will carry a live broadcast on both days, and a photography zone operates beside the fountain from noon."}]}]}'::jsonb,
    'https://picsum.photos/seed/convocation/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '11 hours',
    now() - interval '11 hours',
    now() - interval '11 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'hall-week-preview',
    'Hall Week Preview: What Every Hall Is Planning',
    'A hall-by-hall guide to the biggest social week of the semester, from the boat regatta to the cook-off.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Every hall has confirmed its lineup for hall week, and the rivalry is already spilling onto notice boards. This year''s calendar runs eight days, two more than last year, after the inter-hall committee voted to separate the sports finals from the social nights."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The regatta returns to the lake on Wednesday after a two-year absence, and the cook-off â last year''s surprise hit â moves to the amphitheatre to handle the crowds."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Wristbands go on sale Monday at each hall''s porter lodge. Proceeds fund the halls'' welfare committees."}]}]}'::jsonb,
    'https://picsum.photos/seed/hallweek/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '18 hours',
    now() - interval '18 hours',
    now() - interval '18 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'campus-cats-adoption-drive',
    'The Cats of Faculty Row Get an Official Adoption Drive',
    'The veterinary students'' association counts thirty-one resident cats â and wants homes for the friendliest dozen.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "They nap on lecture theatre steps and patrol the cafeteria bins with proprietary confidence. Now the cats of Faculty Row â thirty-one at the veterinary students'' association''s last census â are getting an official adoption drive."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The association has vaccinated and neutered the colony over the past year, funded by bake sales and an anonymous staff donor. The friendliest dozen are ready for homes, and staff quarters residents get first refusal."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Applicants are screened for housing stability and, in the association president''s words, “basic seriousness about the responsibility of a cat.”"}]}]}'::jsonb,
    'https://picsum.photos/seed/cats/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '26 hours',
    now() - interval '26 hours',
    now() - interval '26 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'sports';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'falcons-clinch-inter-university-cup',
    'Falcons Clinch Inter-University Cup in Penalty Thriller',
    'A save in sudden death sealed the university''s first football title in eleven years before a record home crowd.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The university''s football team ended an eleven-year wait for silverware on Saturday, defeating their oldest rivals 4-3 on penalties after a tense goalless final."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Goalkeeper and final-year physiology student Chuka Nwosu produced the decisive save in sudden death, diving low to his right to deny the visitors'' captain, sparking a pitch invasion from a record home crowd of over eight thousand."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The victory caps a season in which the Falcons lost only once, a run built on the tightest defence in the league and a midfield of second-years who will all return next season."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The team returns to campus on Monday, when the Vice-Chancellor is expected to receive the squad at the main auditorium."}]}]}'::jsonb,
    'https://picsum.photos/seed/football/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    true,
    now() - interval '7 hours',
    now() - interval '7 hours',
    now() - interval '7 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'sports';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'athletics-team-national-trials',
    'Five Athletes Qualify for National University Games',
    'Sprints, long jump and the women''s 800m headline the university''s biggest trials haul in a decade.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Five athletes booked their places at the National University Games after a commanding weekend at the zonal trials, the institution''s biggest qualification haul in a decade."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The women''s 800m produced the standout performance: a championship record from a 200-level economics student who led from the gun and finished three seconds clear."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The Games hold in October. The sports directorate has promised a training camp during the long vacation, a first for the programme."}]}]}'::jsonb,
    'https://picsum.photos/seed/athletics/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '16 hours',
    now() - interval '16 hours',
    now() - interval '16 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'sports';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'basketball-court-renovation',
    'Outdoor Courts Reopen After Alumni-Funded Renovation',
    'New surfaces, floodlights and a repaired perimeter fence end a three-year decline at the sports complex.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The outdoor basketball and volleyball courts reopened this week after a renovation funded by the athletics alumni chapter, ending three years of gradual decline that had pushed evening games onto hostel car parks."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The works cover new acrylic surfaces, floodlights on both courts and a repaired perimeter fence. A booking board at the sports complex office now manages evening slots."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The alumni chapter says phase two â a covered spectator stand â depends on this year''s homecoming fundraising."}]}]}'::jsonb,
    'https://picsum.photos/seed/basketball/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '30 hours',
    now() - interval '30 hours',
    now() - interval '30 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'sports';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'chess-club-national-title',
    'Chess Club Wins First National Team Title on Tiebreak',
    'Four players, nine rounds, and a final-board endgame that decided the championship.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The university chess club won its first national team title on Sunday, edging the defending champions on tiebreak after both teams finished on fourteen match points."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The decisive moment came on board four in the final round, where a rook endgame that computers scored as drawn was ground out over sixty-two moves by the club''s youngest member, a 100-level mathematics student."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The club trains twice weekly in the student centre and says membership has tripled since it began streaming its league matches."}]}]}'::jsonb,
    'https://picsum.photos/seed/chess/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '40 hours',
    now() - interval '40 hours',
    now() - interval '40 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'the-case-for-a-24-hour-library',
    'The Case for a 24-Hour Library',
    'If the university is serious about research output, it should start by unlocking its own front door.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Every examination season, the same scene repeats itself: students crowded under walkway lights at midnight, reading where the mosquitoes are because the library closed at ten."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The arguments against a 24-hour library â staffing costs, security, electricity â are real but solvable, and other institutions of comparable size solved them years ago. Rotating shifts, a single designated hall, and the solar array the university already brags about in brochures would cover it."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The new midnight pilot is welcome, and overdue. But a pilot is a question, not an answer. A university that asks for world-class output must provide world-class access. The books should not sleep before the students do."}]}]}'::jsonb,
    'https://picsum.photos/seed/library/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '8 hours',
    now() - interval '8 hours',
    now() - interval '8 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'grading-transparency-editorial',
    'Grades Should Not Be a Mystery',
    'Departments that publish marking rubrics report fewer disputes. The rest should follow.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "A student who receives a 58 deserves to know why it was not a 62. That is not entitlement; it is the basic feedback loop on which all learning depends."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The handful of departments that publish marking rubrics report fewer grade disputes, not more. Transparency, it turns out, is cheaper than arbitration, and considerably cheaper than the quiet cynicism that spreads when marks feel arbitrary."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The Senate should make rubric publication university policy before the next examination cycle. The departments that resist will be telling us something worth knowing."}]}]}'::jsonb,
    'https://picsum.photos/seed/grading/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '15 hours',
    now() - interval '15 hours',
    now() - interval '15 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'in-defence-of-the-gap-year',
    'In Defence of the Gap Year',
    'The straight-through path from secondary school to convocation is not the only respectable route.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "There is a quiet prejudice on this campus against the student who is twenty-three in a class of nineteen-year-olds, as if the year spent working a market stall or caring for a parent were a stain rather than an education."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The evidence says otherwise. Older entrants in our faculty consistently post stronger final results, and lecturers privately admit they anchor tutorial discussions."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Admissions policy should stop treating the straight-through path as the default virtue. Some of the best minds here took the long road, and the institution is richer for it."}]}]}'::jsonb,
    'https://picsum.photos/seed/gapyear/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '24 hours',
    now() - interval '24 hours',
    now() - interval '24 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'news';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'wifi-is-infrastructure',
    'Campus Wi-Fi Is Infrastructure, Not a Perk',
    'Treating connectivity as a luxury quietly taxes the poorest students the most.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "When the lecture hall Wi-Fi drops, the student with a data plan tethers and moves on. The student without one falls a lecture behind, then a week, then a grade boundary."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Every assignment portal, past-question archive and registration deadline now lives online. Connectivity is not a student perk; it is the road the university itself built and then declined to maintain."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The ICT levy every student already pays should fund a guaranteed baseline: working access points in every teaching building, published uptime figures, and a repair desk that answers within a day."}]}]}'::jsonb,
    'https://picsum.photos/seed/wifi/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '36 hours',
    now() - interval '36 hours',
    now() - interval '36 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'theatre-arts-stages-soyinka-classic',
    'Theatre Arts Stages a Daring Revival of ''Death and the King''s Horseman''',
    'The department''s ambitious production trades period costume for contemporary dress â and divides its audience.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The Department of Theatre Arts opened its season on Friday with a revival of Wole Soyinka''s ''Death and the King''s Horseman'' that relocates the play to the present day, trading period costume for contemporary dress and staging the market scenes amid traders'' umbrellas borrowed from the campus gate."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Director and final-year student Ifeoma Chukwu defended the choice at the post-show talk, arguing the play''s questions about duty and interference have never needed period costume to land."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The production divides its audience precisely where it intends to. Some alumni in attendance called the modern dress a distraction; the students around them mostly disagreed, loudly, at the amphitheatre steps afterwards."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "It runs for two more weekends at the Arts Theatre, with proceeds funding the department''s touring programme."}]}]}'::jsonb,
    'https://picsum.photos/seed/theatre/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '10 hours',
    now() - interval '10 hours',
    now() - interval '10 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'afrobeats-society-year-in-music',
    'The Campus Year in Music, According to the Afrobeats Society',
    'From open-mic discoveries to the songs that soundtracked exam season, a definitive and argumentative list.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The Afrobeats Society has published its annual and gleefully argumentative ranking of the campus year in music, drawn from open-mic nights, hall parties and the unofficial exam-season playlists that circulate every May."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Topping the list is a final-year economics student whose recording, made in a borrowed studio session, has crossed a million streams and earned a distribution deal she negotiated herself between lectures."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The society''s end-of-year concert holds on the last Friday of the semester at the amphitheatre. Last year''s edition filled the venue an hour before the first act."}]}]}'::jsonb,
    'https://picsum.photos/seed/music/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '22 hours',
    now() - interval '22 hours',
    now() - interval '22 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'student-film-festival-winners',
    'Documentary on Night-Shift Security Men Sweeps Student Film Festival',
    'Shot on two phones over one semester, ''Gatekeepers'' took best film, best director and the audience award.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "A quiet documentary about the university''s night-shift security men swept the student film festival on Saturday, taking best film, best director and the audience award."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "''Gatekeepers'' was shot on two phones over a single semester by a three-person crew from the mass communication department, who followed four watchmen through their rounds, their meal breaks and the long silence between two and four a.m."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The jury citation praised the film''s patience. The subjects attended the screening as guests of honour and received the night''s longest ovation."}]}]}'::jsonb,
    'https://picsum.photos/seed/film/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '34 hours',
    now() - interval '34 hours',
    now() - interval '34 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'campus';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'poetry-collective-anthology',
    'Campus Poetry Collective Publishes First Print Anthology',
    'Sixty poems, four languages, and a launch that packed the humanities courtyard.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The campus poetry collective launched its first print anthology on Thursday, a sixty-poem volume drawing on four years of open-mic nights and writing workshops."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The anthology publishes in four languages â English, Yoruba, Hausa and Igbo â with facing-page translations produced by the collective''s members themselves."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Copies sold out at the courtyard launch. A second print run arrives at the campus bookshop this month, and proceeds fund next year''s workshop series."}]}]}'::jsonb,
    'https://picsum.photos/seed/poetry/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '44 hours',
    now() - interval '44 hours',
    now() - interval '44 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'technology';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'robotics-club-wins-national-competition',
    'Robotics Club Wins National Competition With Rice-Sorting Machine',
    'The winning build sorts and grades rice grains using a camera and a neural network trained in a hostel room.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The university robotics club took first place at the national engineering innovation competition with a machine that sorts and grades rice grains in real time."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The system pairs a conveyor, a camera and a neural network the team trained on a dataset they photographed themselves over six weeks in a hostel room â forty thousand labelled grains under a desk lamp."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Judges praised the build''s cost discipline: every component is locally sourced, and the team published the full bill of materials, which comes in under the price of a mid-range phone."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The team received a cash prize and an incubation offer, and says a field version for rice mills is already in design."}]}]}'::jsonb,
    'https://picsum.photos/seed/robotics/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    true,
    now() - interval '6 hours',
    now() - interval '6 hours',
    now() - interval '6 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'technology';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'solar-microgrid-pilot',
    'Physics Department Pilots Solar Microgrid for Laboratory Block',
    'The pilot aims to end the generator lottery that decides whether practicals hold.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "The Department of Physics has switched on a pilot solar microgrid serving its main laboratory block, a first for the university and a possible template for the wider campus."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The installation pairs rooftop panels with battery storage sized to carry afternoon practical sessions through grid outages, ending what students call the generator lottery â the daily question of whether practicals hold at all."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "If the pilot holds through the rainy season, the works department says the design will be costed for the library and the teaching hospital annex."}]}]}'::jsonb,
    'https://picsum.photos/seed/solar/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '19 hours',
    now() - interval '19 hours',
    now() - interval '19 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'technology';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'computer-science-hackathon',
    '48-Hour Hackathon Produces a Timetable App the Registry Wants to Adopt',
    'The winning team solved the clash-detection problem that has haunted course registration for years.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "A student team walked out of the weekend''s 48-hour hackathon with more than the prize money: the registry has asked to trial their winning project, a timetable app that detects course clashes before registration closes."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The clash-detection problem â students discovering mid-semester that two registered courses share a slot â generates hundreds of add-drop petitions every session. The winning build flags conflicts at selection time and proposes alternatives."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The registry trial begins with two faculties next session. The team has agreed to open-source the scheduling engine."}]}]}'::jsonb,
    'https://picsum.photos/seed/hackathon/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '28 hours',
    now() - interval '28 hours',
    now() - interval '28 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

  SELECT id INTO v_section FROM public.sections WHERE slug = 'technology';
  INSERT INTO public.articles (
    slug, title, dek, body, cover_url, section_id, author_id,
    language, status, featured, breaking, published_at, created_at, updated_at
  ) VALUES (
    'biology-wetland-survey',
    'Student Survey Finds Campus Wetland Richer Than Records Show',
    'Two hundred species logged in a semester, including three birds never before recorded on campus.',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "A semester-long survey by undergraduate biology students has logged over two hundred species in the campus wetland, including three bird species never before recorded on university grounds."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The survey, run as a practical course with weekly dawn counts, more than doubles the species list in the university''s official environmental records, which had not been updated in fifteen years."}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The department is submitting the dataset to a national biodiversity archive and has proposed a boardwalk transect so the counts can continue without trampling the reed beds."}]}]}'::jsonb,
    'https://picsum.photos/seed/wetland/1200/800',
    v_section,
    v_author,
    'en',
    'published',
    false,
    false,
    now() - interval '48 hours',
    now() - interval '48 hours',
    now() - interval '48 hours'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    dek = EXCLUDED.dek,
    body = EXCLUDED.body,
    cover_url = EXCLUDED.cover_url,
    section_id = EXCLUDED.section_id,
    status = 'published',
    featured = EXCLUDED.featured,
    breaking = EXCLUDED.breaking,
    published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
    updated_at = now();

END $$;

-- Verification
SELECT 'sections' AS what, count(*)::text FROM public.sections WHERE slug IN ('news','campus','sports','technology')
UNION ALL
SELECT 'published', count(*)::text FROM public.articles WHERE status = 'published'
UNION ALL
SELECT 'breaking', count(*)::text FROM public.articles WHERE breaking = true AND status = 'published'
UNION ALL
SELECT 'featured_top_news', count(*)::text
FROM public.articles
WHERE featured = true AND breaking = false AND status = 'published';

