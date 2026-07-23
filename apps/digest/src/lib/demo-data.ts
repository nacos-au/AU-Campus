/**
 * Fixture content for demo mode — mirrors what the seeded database contains
 * so the public site can be previewed with zero infrastructure.
 */
import type { Ad, ArticleWithMeta, Edition, Section } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function doc(...paras: string[]) {
  return {
    type: "doc",
    content: paras.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

const AUTHORS = [
  "Wale Adeyemi",
  "Ngozi Bello",
  "Tunde Bakare",
  "Amina Yusuf",
  "Chidera Okafor",
];

let articleSeq = 0;

function article(a: {
  slug: string;
  title: string;
  dek: string;
  section: Section;
  paras: string[];
  imageSeed: string;
  featured?: boolean;
  hoursAgo: number;
}): ArticleWithMeta {
  articleSeq += 1;
  return {
    id: `demo-article-${articleSeq}`,
    slug: a.slug,
    title: a.title,
    dek: a.dek,
    body: doc(...a.paras),
    cover_url: `https://picsum.photos/seed/${a.imageSeed}/1200/800`,
    section_id: a.section.id,
    author_id: `demo-author-${articleSeq % AUTHORS.length}`,
    language: "en",
    status: "published",
    featured: a.featured ?? false,
    editor_note: null,
    published_at: new Date(Date.now() - a.hoursAgo * 3_600_000).toISOString(),
    created_at: new Date(Date.now() - a.hoursAgo * 3_600_000).toISOString(),
    updated_at: new Date(Date.now() - a.hoursAgo * 3_600_000).toISOString(),
    sections: { slug: a.section.slug, name: a.section.name },
    profiles: { display_name: AUTHORS[articleSeq % AUTHORS.length] },
  };
}

// ─── Sections ────────────────────────────────────────────────────────────────

export const demoSections: Section[] = [
  { id: 1, slug: "news", name: "News", position: 1 },
  { id: 2, slug: "campus", name: "Campus Life", position: 2 },
  { id: 3, slug: "sports", name: "Sports", position: 3 },
  { id: 4, slug: "opinion", name: "Opinion", position: 4 },
  { id: 5, slug: "culture", name: "Culture", position: 5 },
  { id: 6, slug: "science", name: "Science & Tech", position: 6 },
];

const [news, campus, sports, opinion, culture, science] = demoSections;

// ─── Articles ────────────────────────────────────────────────────────────────

export const demoArticles: ArticleWithMeta[] = [
  article({
    slug: "senate-approves-new-engineering-faculty",
    title: "University Senate Approves Landmark Engineering Faculty Expansion",
    dek: "The decision, three years in the making, will double laboratory capacity and add four new degree programmes by next session.",
    section: news,
    imageSeed: "engineering",
    featured: true,
    hoursAgo: 2,
    paras: [
      "The University Senate voted overwhelmingly on Tuesday to approve the largest expansion of the Faculty of Engineering in the institution's history, committing funds to double laboratory capacity and introduce four new degree programmes.",
      "The expansion, first proposed three years ago, faced repeated delays over funding disputes and site allocation. Under the approved plan, construction of two new laboratory complexes will begin before the end of the semester, with the first phase scheduled for commissioning within eighteen months.",
      "Sources in the Vice-Chancellor's office confirmed that the new programmes — mechatronics, petroleum engineering, biomedical engineering and software engineering — will admit their first cohorts next academic session, pending final accreditation.",
      "\u201CThis is the single most consequential academic investment we have made in a decade,\u201D the Dean of Engineering said at a press briefing on Wednesday, adding that partnerships with three industry sponsors would cover roughly a third of the projected costs.",
      "Student reaction has been broadly positive, though union representatives cautioned that tuition for the new programmes must remain within reach of ordinary families. A fee schedule is expected before admissions open.",
    ],
  }),
  article({
    slug: "campus-food-prices-investigation",
    title: "Inside the Quiet Rise of Cafeteria Prices",
    dek: "A plate of rice has risen forty percent in a session. We traced where the money goes.",
    section: news,
    imageSeed: "cafeteria",
    hoursAgo: 5,
    paras: [
      "The price of a standard plate of rice at the central cafeteria has risen forty percent in a single session, outpacing both national food inflation and the vendors' own stated costs. Over six weeks, this paper collected receipts, interviewed vendors and reviewed the catering unit's levy schedule to understand why.",
      "Interviews with eleven vendors point to a stack of pressures: new stall levies introduced in January, generator fuel during the long March outages, and a single supplier who now controls wholesale delivery to campus after two competitors lost their permits.",
      "The supplier, whose permit renewal was approved in a closed session of the works committee, declined repeated requests for comment. Committee minutes obtained by this paper show the renewal passed without competitive bidding.",
      "The student union has petitioned for a price review board with student representation. Management says a response is coming \u201Cshortly\u201D. Until then, the queue at the back gate's informal food stalls grows longer every week.",
    ],
  }),
  article({
    slug: "new-shuttle-routes-review",
    title: "The New Shuttle Routes, Reviewed by the People Who Ride Them",
    dek: "Two weeks in, students say the expanded loop saves time — unless you live past the science complex.",
    section: news,
    imageSeed: "shuttle",
    hoursAgo: 9,
    paras: [
      "Two weeks after the transport unit redrew the campus shuttle map, opinion among riders has settled into a clear pattern: the expanded loop is faster for most, and slower for an unlucky few.",
      "Students living past the science complex report waits of up to twenty-five minutes at peak hours, as buses fill before reaching the last stops. \u201CBy the time it gets to us, it's standing room only or it doesn't stop at all,\u201D said a final-year microbiology student.",
      "The transport unit says it is reviewing ridership data and will adjust frequencies before examinations begin. An additional bus, donated by an alumni association, enters service next month.",
    ],
  }),
  article({
    slug: "library-extends-exam-hours",
    title: "Library Extends Opening Hours to Midnight for Exam Season",
    dek: "A pilot programme adds four reading halls and two hundred seats to the evening shift.",
    section: news,
    imageSeed: "library-night",
    hoursAgo: 14,
    paras: [
      "The university library will remain open until midnight throughout the examination period, the University Librarian announced on Monday, in a pilot that answers one of the student union's longest-running demands.",
      "Four reading halls will run on the extended schedule, adding roughly two hundred seats to the evening shift. Security escorts to the hostels will operate on the half hour after 10 p.m.",
      "If the pilot passes review — measured by attendance and incident reports — the extended hours could become permanent next session. Union officials are already pushing for a full 24-hour schedule.",
    ],
  }),
  article({
    slug: "alumni-endow-scholarship-fund",
    title: "Class of '02 Endows ₦120 Million Scholarship Fund",
    dek: "The gift, the largest single alumni donation on record, will fully fund forty indigent students a year.",
    section: news,
    imageSeed: "scholarship",
    hoursAgo: 20,
    paras: [
      "The graduating class of 2002 marked its reunion with the largest single alumni donation in the university's history: a ₦120 million endowment that will fully fund forty indigent students each year, covering tuition, accommodation and a book allowance.",
      "The fund will be administered by the scholarships board with two alumni trustees, and applications open at the start of next session. Selection will weigh financial need alongside academic standing.",
      "\u201CMany of us nearly didn't finish,\u201D the class representative said at the signing ceremony. \u201CThis is us holding the door open behind us.\u201D",
    ],
  }),

  // ── Campus Life ──
  article({
    slug: "hostel-allocation-reforms-announced",
    title: "Hostel Allocation Goes Fully Digital After Years of Complaints",
    dek: "Student Affairs says the new portal will end the overnight queues that have defined allocation week for a generation of students.",
    section: campus,
    imageSeed: "hostel",
    hoursAgo: 4,
    paras: [
      "The Division of Student Affairs has announced that hostel allocation will move entirely online from next session, ending the overnight queues that have long defined the start of every academic year.",
      "Under the new system, students will select rooms through a portal that opens in ranked windows determined by level and academic standing. Payment integrates directly with the bursary, and allocation letters arrive by email within the hour.",
      "Student union representatives cautiously welcomed the change but demanded a public audit of room inventory before the portal launches, citing years of \u201Cmissing\u201D rooms that later surfaced under informal arrangements.",
      "A pilot run with two halls last month processed four hundred allocations in a day without incident, according to the unit's programme officer.",
    ],
  }),
  article({
    slug: "convocation-week-what-to-expect",
    title: "Convocation Week: Everything You Need to Know",
    dek: "Road closures, gown collection windows, guest limits and the full ceremony timetable, gathered in one place.",
    section: campus,
    imageSeed: "convocation",
    hoursAgo: 11,
    paras: [
      "Convocation week begins Monday, and with it the annual transformation of the campus: marquees on the cricket oval, road closures around the main gate, and a strict schedule of gown collection windows.",
      "Graduands are advised to collect gowns from the Great Hall annex between 9 a.m. and 4 p.m., with faculties assigned specific days to reduce queues. A valid student ID and clearance slip are required; proxies are not accepted.",
      "Each graduand receives two guest passes for the main ceremony. The overflow arena will carry a live broadcast on both days, and a photography zone operates beside the fountain from noon.",
    ],
  }),
  article({
    slug: "hall-week-preview",
    title: "Hall Week Preview: What Every Hall Is Planning",
    dek: "A hall-by-hall guide to the biggest social week of the semester, from the boat regatta to the cook-off.",
    section: campus,
    imageSeed: "hallweek",
    hoursAgo: 18,
    paras: [
      "Every hall has confirmed its lineup for hall week, and the rivalry is already spilling onto notice boards. This year's calendar runs eight days, two more than last year, after the inter-hall committee voted to separate the sports finals from the social nights.",
      "The regatta returns to the lake on Wednesday after a two-year absence, and the cook-off — last year's surprise hit — moves to the amphitheatre to handle the crowds.",
      "Wristbands go on sale Monday at each hall's porter lodge. Proceeds fund the halls' welfare committees.",
    ],
  }),
  article({
    slug: "campus-cats-adoption-drive",
    title: "The Cats of Faculty Row Get an Official Adoption Drive",
    dek: "The veterinary students' association counts thirty-one resident cats — and wants homes for the friendliest dozen.",
    section: campus,
    imageSeed: "cats",
    hoursAgo: 26,
    paras: [
      "They nap on lecture theatre steps and patrol the cafeteria bins with proprietary confidence. Now the cats of Faculty Row — thirty-one at the veterinary students' association's last census — are getting an official adoption drive.",
      "The association has vaccinated and neutered the colony over the past year, funded by bake sales and an anonymous staff donor. The friendliest dozen are ready for homes, and staff quarters residents get first refusal.",
      "Applicants are screened for housing stability and, in the association president's words, \u201Cbasic seriousness about the responsibility of a cat.\u201D",
    ],
  }),

  // ── Sports ──
  article({
    slug: "falcons-clinch-inter-university-cup",
    title: "Falcons Clinch Inter-University Cup in Penalty Thriller",
    dek: "A save in sudden death sealed the university's first football title in eleven years before a record home crowd.",
    section: sports,
    imageSeed: "football",
    hoursAgo: 7,
    paras: [
      "The university's football team ended an eleven-year wait for silverware on Saturday, defeating their oldest rivals 4-3 on penalties after a tense goalless final.",
      "Goalkeeper and final-year physiology student Chuka Nwosu produced the decisive save in sudden death, diving low to his right to deny the visitors' captain, sparking a pitch invasion from a record home crowd of over eight thousand.",
      "The victory caps a season in which the Falcons lost only once, a run built on the tightest defence in the league and a midfield of second-years who will all return next season.",
      "The team returns to campus on Monday, when the Vice-Chancellor is expected to receive the squad at the main auditorium.",
    ],
  }),
  article({
    slug: "athletics-team-national-trials",
    title: "Five Athletes Qualify for National University Games",
    dek: "Sprints, long jump and the women's 800m headline the university's biggest trials haul in a decade.",
    section: sports,
    imageSeed: "athletics",
    hoursAgo: 16,
    paras: [
      "Five athletes booked their places at the National University Games after a commanding weekend at the zonal trials, the institution's biggest qualification haul in a decade.",
      "The women's 800m produced the standout performance: a championship record from a 200-level economics student who led from the gun and finished three seconds clear.",
      "The Games hold in October. The sports directorate has promised a training camp during the long vacation, a first for the programme.",
    ],
  }),
  article({
    slug: "basketball-court-renovation",
    title: "Outdoor Courts Reopen After Alumni-Funded Renovation",
    dek: "New surfaces, floodlights and a repaired perimeter fence end a three-year decline at the sports complex.",
    section: sports,
    imageSeed: "basketball",
    hoursAgo: 30,
    paras: [
      "The outdoor basketball and volleyball courts reopened this week after a renovation funded by the athletics alumni chapter, ending three years of gradual decline that had pushed evening games onto hostel car parks.",
      "The works cover new acrylic surfaces, floodlights on both courts and a repaired perimeter fence. A booking board at the sports complex office now manages evening slots.",
      "The alumni chapter says phase two — a covered spectator stand — depends on this year's homecoming fundraising.",
    ],
  }),
  article({
    slug: "chess-club-national-title",
    title: "Chess Club Wins First National Team Title on Tiebreak",
    dek: "Four players, nine rounds, and a final-board endgame that decided the championship.",
    section: sports,
    imageSeed: "chess",
    hoursAgo: 40,
    paras: [
      "The university chess club won its first national team title on Sunday, edging the defending champions on tiebreak after both teams finished on fourteen match points.",
      "The decisive moment came on board four in the final round, where a rook endgame that computers scored as drawn was ground out over sixty-two moves by the club's youngest member, a 100-level mathematics student.",
      "The club trains twice weekly in the student centre and says membership has tripled since it began streaming its league matches.",
    ],
  }),

  // ── Opinion ──
  article({
    slug: "the-case-for-a-24-hour-library",
    title: "The Case for a 24-Hour Library",
    dek: "If the university is serious about research output, it should start by unlocking its own front door.",
    section: opinion,
    imageSeed: "library",
    hoursAgo: 8,
    paras: [
      "Every examination season, the same scene repeats itself: students crowded under walkway lights at midnight, reading where the mosquitoes are because the library closed at ten.",
      "The arguments against a 24-hour library — staffing costs, security, electricity — are real but solvable, and other institutions of comparable size solved them years ago. Rotating shifts, a single designated hall, and the solar array the university already brags about in brochures would cover it.",
      "The new midnight pilot is welcome, and overdue. But a pilot is a question, not an answer. A university that asks for world-class output must provide world-class access. The books should not sleep before the students do.",
    ],
  }),
  article({
    slug: "grading-transparency-editorial",
    title: "Grades Should Not Be a Mystery",
    dek: "Departments that publish marking rubrics report fewer disputes. The rest should follow.",
    section: opinion,
    imageSeed: "grading",
    hoursAgo: 15,
    paras: [
      "A student who receives a 58 deserves to know why it was not a 62. That is not entitlement; it is the basic feedback loop on which all learning depends.",
      "The handful of departments that publish marking rubrics report fewer grade disputes, not more. Transparency, it turns out, is cheaper than arbitration, and considerably cheaper than the quiet cynicism that spreads when marks feel arbitrary.",
      "The Senate should make rubric publication university policy before the next examination cycle. The departments that resist will be telling us something worth knowing.",
    ],
  }),
  article({
    slug: "in-defence-of-the-gap-year",
    title: "In Defence of the Gap Year",
    dek: "The straight-through path from secondary school to convocation is not the only respectable route.",
    section: opinion,
    imageSeed: "gapyear",
    hoursAgo: 24,
    paras: [
      "There is a quiet prejudice on this campus against the student who is twenty-three in a class of nineteen-year-olds, as if the year spent working a market stall or caring for a parent were a stain rather than an education.",
      "The evidence says otherwise. Older entrants in our faculty consistently post stronger final results, and lecturers privately admit they anchor tutorial discussions.",
      "Admissions policy should stop treating the straight-through path as the default virtue. Some of the best minds here took the long road, and the institution is richer for it.",
    ],
  }),
  article({
    slug: "wifi-is-infrastructure",
    title: "Campus Wi-Fi Is Infrastructure, Not a Perk",
    dek: "Treating connectivity as a luxury quietly taxes the poorest students the most.",
    section: opinion,
    imageSeed: "wifi",
    hoursAgo: 36,
    paras: [
      "When the lecture hall Wi-Fi drops, the student with a data plan tethers and moves on. The student without one falls a lecture behind, then a week, then a grade boundary.",
      "Every assignment portal, past-question archive and registration deadline now lives online. Connectivity is not a student perk; it is the road the university itself built and then declined to maintain.",
      "The ICT levy every student already pays should fund a guaranteed baseline: working access points in every teaching building, published uptime figures, and a repair desk that answers within a day.",
    ],
  }),

  // ── Culture ──
  article({
    slug: "theatre-arts-stages-soyinka-classic",
    title: "Theatre Arts Stages a Daring Revival of 'Death and the King's Horseman'",
    dek: "The department's ambitious production trades period costume for contemporary dress — and divides its audience.",
    section: culture,
    imageSeed: "theatre",
    hoursAgo: 10,
    paras: [
      "The Department of Theatre Arts opened its season on Friday with a revival of Wole Soyinka's 'Death and the King's Horseman' that relocates the play to the present day, trading period costume for contemporary dress and staging the market scenes amid traders' umbrellas borrowed from the campus gate.",
      "Director and final-year student Ifeoma Chukwu defended the choice at the post-show talk, arguing the play's questions about duty and interference have never needed period costume to land.",
      "The production divides its audience precisely where it intends to. Some alumni in attendance called the modern dress a distraction; the students around them mostly disagreed, loudly, at the amphitheatre steps afterwards.",
      "It runs for two more weekends at the Arts Theatre, with proceeds funding the department's touring programme.",
    ],
  }),
  article({
    slug: "afrobeats-society-year-in-music",
    title: "The Campus Year in Music, According to the Afrobeats Society",
    dek: "From open-mic discoveries to the songs that soundtracked exam season, a definitive and argumentative list.",
    section: culture,
    imageSeed: "music",
    hoursAgo: 22,
    paras: [
      "The Afrobeats Society has published its annual and gleefully argumentative ranking of the campus year in music, drawn from open-mic nights, hall parties and the unofficial exam-season playlists that circulate every May.",
      "Topping the list is a final-year economics student whose recording, made in a borrowed studio session, has crossed a million streams and earned a distribution deal she negotiated herself between lectures.",
      "The society's end-of-year concert holds on the last Friday of the semester at the amphitheatre. Last year's edition filled the venue an hour before the first act.",
    ],
  }),
  article({
    slug: "student-film-festival-winners",
    title: "Documentary on Night-Shift Security Men Sweeps Student Film Festival",
    dek: "Shot on two phones over one semester, 'Gatekeepers' took best film, best director and the audience award.",
    section: culture,
    imageSeed: "film",
    hoursAgo: 34,
    paras: [
      "A quiet documentary about the university's night-shift security men swept the student film festival on Saturday, taking best film, best director and the audience award.",
      "'Gatekeepers' was shot on two phones over a single semester by a three-person crew from the mass communication department, who followed four watchmen through their rounds, their meal breaks and the long silence between two and four a.m.",
      "The jury citation praised the film's patience. The subjects attended the screening as guests of honour and received the night's longest ovation.",
    ],
  }),
  article({
    slug: "poetry-collective-anthology",
    title: "Campus Poetry Collective Publishes First Print Anthology",
    dek: "Sixty poems, four languages, and a launch that packed the humanities courtyard.",
    section: culture,
    imageSeed: "poetry",
    hoursAgo: 44,
    paras: [
      "The campus poetry collective launched its first print anthology on Thursday, a sixty-poem volume drawing on four years of open-mic nights and writing workshops.",
      "The anthology publishes in four languages — English, Yoruba, Hausa and Igbo — with facing-page translations produced by the collective's members themselves.",
      "Copies sold out at the courtyard launch. A second print run arrives at the campus bookshop this month, and proceeds fund next year's workshop series.",
    ],
  }),

  // ── Science & Tech ──
  article({
    slug: "robotics-club-wins-national-competition",
    title: "Robotics Club Wins National Competition With Rice-Sorting Machine",
    dek: "The winning build sorts and grades rice grains using a camera and a neural network trained in a hostel room.",
    section: science,
    imageSeed: "robotics",
    hoursAgo: 6,
    paras: [
      "The university robotics club took first place at the national engineering innovation competition with a machine that sorts and grades rice grains in real time.",
      "The system pairs a conveyor, a camera and a neural network the team trained on a dataset they photographed themselves over six weeks in a hostel room — forty thousand labelled grains under a desk lamp.",
      "Judges praised the build's cost discipline: every component is locally sourced, and the team published the full bill of materials, which comes in under the price of a mid-range phone.",
      "The team received a cash prize and an incubation offer, and says a field version for rice mills is already in design.",
    ],
  }),
  article({
    slug: "solar-microgrid-pilot",
    title: "Physics Department Pilots Solar Microgrid for Laboratory Block",
    dek: "The pilot aims to end the generator lottery that decides whether practicals hold.",
    section: science,
    imageSeed: "solar",
    hoursAgo: 19,
    paras: [
      "The Department of Physics has switched on a pilot solar microgrid serving its main laboratory block, a first for the university and a possible template for the wider campus.",
      "The installation pairs rooftop panels with battery storage sized to carry afternoon practical sessions through grid outages, ending what students call the generator lottery — the daily question of whether practicals hold at all.",
      "If the pilot holds through the rainy season, the works department says the design will be costed for the library and the teaching hospital annex.",
    ],
  }),
  article({
    slug: "computer-science-hackathon",
    title: "48-Hour Hackathon Produces a Timetable App the Registry Wants to Adopt",
    dek: "The winning team solved the clash-detection problem that has haunted course registration for years.",
    section: science,
    imageSeed: "hackathon",
    hoursAgo: 28,
    paras: [
      "A student team walked out of the weekend's 48-hour hackathon with more than the prize money: the registry has asked to trial their winning project, a timetable app that detects course clashes before registration closes.",
      "The clash-detection problem — students discovering mid-semester that two registered courses share a slot — generates hundreds of add-drop petitions every session. The winning build flags conflicts at selection time and proposes alternatives.",
      "The registry trial begins with two faculties next session. The team has agreed to open-source the scheduling engine.",
    ],
  }),
  article({
    slug: "biology-wetland-survey",
    title: "Student Survey Finds Campus Wetland Richer Than Records Show",
    dek: "Two hundred species logged in a semester, including three birds never before recorded on campus.",
    section: science,
    imageSeed: "wetland",
    hoursAgo: 48,
    paras: [
      "A semester-long survey by undergraduate biology students has logged over two hundred species in the campus wetland, including three bird species never before recorded on university grounds.",
      "The survey, run as a practical course with weekly dawn counts, more than doubles the species list in the university's official environmental records, which had not been updated in fifteen years.",
      "The department is submitting the dataset to a national biodiversity archive and has proposed a boardwalk transect so the counts can continue without trampling the reed beds.",
    ],
  }),
];

// ─── Editions & Ads ──────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export const demoEditions: Edition[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    title: "Vol. 12, No. 4 — Convocation Special",
    description:
      "A 24-page special edition covering convocation week: the honorary degree list, a decade of graduating-class data, and the photo essay of the year.",
    cover_url: "https://picsum.photos/seed/edition1/800/1100",
    issue_date: daysAgo(7),
    price_kobo: 50000,
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    title: "Vol. 12, No. 3 — The Housing Issue",
    description:
      "Our investigation into hostel allocation, the full shuttle-route review, and an interview with the outgoing union president.",
    cover_url: "https://picsum.photos/seed/edition2/800/1100",
    issue_date: daysAgo(30),
    price_kobo: 50000,
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    title: "Vol. 12, No. 2 — The Sports Annual",
    description:
      "Every result, every table and every team photo from the sporting year, plus the making of the Falcons' cup run.",
    cover_url: "https://picsum.photos/seed/edition3/800/1100",
    issue_date: daysAgo(60),
    price_kobo: 40000,
    published: true,
    created_at: new Date().toISOString(),
  },
];

export const demoAds: Ad[] = [
  {
    id: "ad-1",
    slot: "leaderboard",
    image_url: "https://picsum.photos/seed/adlead/970/250",
    target_url: "https://example.com",
    label: "Campus Bookshop — New Session Sale",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "ad-2",
    slot: "sidebar",
    image_url: "https://picsum.photos/seed/adside/300/600",
    target_url: "https://example.com",
    label: "Faculty of Law — LLM Admissions Open",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "ad-3",
    slot: "infeed",
    image_url: "https://picsum.photos/seed/adfeed/600/400",
    target_url: "https://example.com",
    label: "Student Union Health Week",
    active: true,
    created_at: new Date().toISOString(),
  },
];

export const demoTables: Record<string, Record<string, unknown>[]> = {
  sections: demoSections as unknown as Record<string, unknown>[],
  articles: demoArticles as unknown as Record<string, unknown>[],
  editions: demoEditions as unknown as Record<string, unknown>[],
  ads: demoAds as unknown as Record<string, unknown>[],
  purchases: [],
  profiles: [],
  edition_files: [],
};
