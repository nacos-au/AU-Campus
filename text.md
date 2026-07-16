AU Score: Campus Sports Analytics Engine — Technical Specification

## 1. Project Overview

A centralized, real-time sports analytics and match-tracking platform designed for university athletics. The system provides a premium, student-facing public interface (resembling the Premier League and NBA websites) while relying on a simplified, offline-resilient mobile interface for designated "Record Keepers" to log match events manually in real time.

The platform supports Football, Basketball, Lawn Tennis, and Track & Field, handling all sport-specific scoring logic, tournament structures, and historical statistics.

## 2. Tech Stack

* **Framework:** Next.js (App Router, Server-Side Rendering for public pages)
* **Database & Backend:** Supabase (PostgreSQL)
* **Real-time:** Supabase Realtime (WebSockets via `pg_changes`)
* **Storage:** Supabase Storage (Player avatars, department logos)
* **Authentication:** Supabase Auth (Magic Links / Email + Password for Admins and Students)
* **State Management & Data Fetching:** TanStack Query (React Query) & TanStack Table
* **Styling:** Tailwind CSS (Dark mode optimized, high-contrast UI)

## 3. UI/UX & Aesthetic Guidelines

The UI must deliver a high-octane, professional sports network experience.

* **Vibe:** Premier League Match Centre meets NBA 2K stats dashboard.
* **Styling Rules:** Deep dark mode base, high-contrast vibrant typography (neon greens/reds for live states), bold card layouts, and dynamic state transitions (e.g., pulsing red "LIVE" indicators, glowing score updates).
* **Responsiveness:**
* *Public Portal:* Desktop & Mobile optimized.
* *Record Keeper UI:* Strictly Mobile-First, prioritizing large touch targets and single-hand operation.



## 4. Core User Roles

1. **Super Admin (Sports Director/Dept Execs):** Manages macro data. Registers departments, teams, tournaments, manages player rosters, generates fixtures, and assigns Record Keepers.
2. **Record Keeper (Sideline Logger):** Requires auth. Sees a highly simplified, distraction-free mobile interface. Can only access assigned matches. Uses large, single-tap buttons to log events.
3. **Student (Fan/Public):** Read-only (except for voting). Browses live scores, league tables, team profiles, and player stats. Can sign in to vote on match outcomes.

## 5. Sport-Specific Recording Logic & Rulesets

To ensure data integrity via manual entry, the recording UI is restricted to logging *macro events* only.

### A. Football (Soccer)

* **UI:** Tally & Select (e.g., Tap `+ Goal` -> Select Scorer -> Select Assist).
* **Tracked Stats:** Goals, Assists, Yellow/Red Cards, Substitutions.
* **Automations:** Clean sheets auto-calculated if goals conceded = 0.
* **Edge Cases:**
* *Disallowed Goals (VAR):* Never delete the row. Insert new event `event_type: 'disallowed'` pointing to the original goal ID, and set original `is_void: true`. DB triggers recalculate the score.
* *Extra Time/Penalties:* If tournament rules dictate, triggers transition to `extra_time`. If tied, shifts to a binary Penalty Shootout interface (Score/Miss). Shootout goals do *not* count toward player seasonal stats.



### B. Basketball

* **UI:** Tap-to-Increment Grid. List of active players on court. Tap player -> Quick tray opens (`+1`, `+2`, `+3`, `+Foul`).
* **Tracked Stats:** Points (1pt, 2pt, 3pt), Personal/Team Fouls.
* **Edge Cases:** Cannot end in a tie. Auto-spawns infinite 5-minute `overtime` periods until a winner emerges.

### C. Lawn Tennis

* **UI:** Simple binary clicker (`[Point Player A]` / `[Point Player B]`).
* **Automations:** Backend state machine calculates scoring logic (15 -> 30 -> 40 -> Deuce -> Ad -> Game -> Set). Auto-triggers standard Tiebreak logic at 6-6.

### D. Track & Field (Running)

* **UI:** Post-race bulk manual entry.
* **Logic:** Matches mapped with `away_team_id: null`. Heats lead to Finals. Keepers enter final precise times (e.g., `10.58s`) against pre-assigned lane rosters.

## 6. The Live Match Workflow (State Machine)

The Record Keeper must follow a strict, linear flow to prevent database corruption.

1. **Pre-Match (Roster Check):** Lock in starting lineups and bench.
2. **Live State:** Record events. Data saved to an event ledger (`match_events`), caching locally if offline.
3. **Half-Time/Period End:** Review chronological event log and validate period score.
4. **Post-Match Review:** Final review of all events. Submit draft to Admin for final sign-off before writing to seasonal standings.

## 7. Advanced Feature Specifications

### 7.1 Automatic Match-Timer & Injury Time Tracker

* **Implementation:** The Record Keeper UI features a live clock and a large `[❚❚ TIME LOST]` button.
* **Logic:** The main clock runs continuously. Tapping the button starts a secondary "Time Lost" timer. Resuming play locks in the accumulated seconds.
* **Sync:** Both running time and accumulated extra time sync via WebSockets to the student frontend (e.g., showing `41:24 (+2m Injury Time Expected)`).

### 7.2 Double-Bar Win Probability Engine

Displayed on upcoming/live match pages.

* **Bar 1 (Algo/Historical):** A PostgreSQL function calculates a dynamic Elo rating for teams based on past results. Generates a logistic curve probability.
* **Bar 2 (Student Voting):** Requires student auth (validated via matric number/email). Allows one vote per user (Home/Draw/Away).

### 7.3 SofaScore-Style Profiles

* **Club Profiles:** Displays current form (W-D-L dots), total team stats (Goals, Clean sheets), chronological fixture/results feed, live standings, and grouped squad rosters.
* **Player Profiles:** Fully detailed sports resume. Shows primary/secondary sports, overall SofaScore performance map (PPG, Goals/Game, Win/Loss ratios), and a granular match-by-match log.

## 8. Core Database Schema Architecture (Supabase / PostgreSQL)

* `departments`: id, name, short_code (e.g., CSC)
* `sports`: id, name, type (team/individual), score_type
* `teams`: id, department_id, sport_id, name, logo_url
* `players`: id, department_id, first_name, last_name, matric_number, avatar_url
* `player_sport_registry`: player_id, team_id, jersey_number
* `tournaments`: id, name, sport_id, category (league/cup), rules (JSONB: extra_time, penalties)
* `matches`: id, tournament_id, sport_id, home_team_id, away_team_id, status (scheduled/live/completed), current_period, home_score, away_score, scheduled_at
* `match_events`: id, match_id, team_id, player_id, event_type (goal, assist, foul, etc.), period, match_time, details (JSONB), is_void
* `match_clock_logs`: id, match_id, event_type (start, stop_time_lost), match_time, accumulated_lost_ms

## 9. Critical Operational Resilience Requirements

1. **Offline Resilience (Optimistic UI):** Given poor campus Wi-Fi, the keeper UI must use TanStack Query to update the local screen instantly and queue database syncs via `localStorage` until connectivity is restored.
2. **The "Undo" Ledger:** State is never updated absolutely. The `match_events` table acts as a ledger. Undoing a mistake involves deleting the last ledger entry, triggering a DB function to recalculate the score.
3. **Automated Disciplinary Rules:** Database logic flags players as `suspended: true` after straight red cards or yellow card accumulation, blocking them from selection in the pre-match roster check.
4. **Instant Campus Distribution:** Utilize Supabase Edge Functions triggered by `match_status = 'completed'` to ping webhooks, automatically sending formatted text recaps to department WhatsApp/Telegram channels.

---

For more context:
That stack is an absolute powerhouse. Honestly, **Next.js + Supabase + TanStack** is basically the gold standard for this kind of real-time, data-heavy build.

It gives you the speed of server-side rendering (SSR) in Next.js (perfect for public match centers and player profile pages that need to load instantly) paired with Postgres's relational muscle.

Here is why this stack hits the sweet spot, a quick architectural optimization, and the critical operational gaps you might be overlooking before you write your first schema.

---

## Why This Stack is Spot-On

* **Supabase Realtime:** This is your secret weapon. Instead of setting up custom WebSocket servers, you can subscribe client-side directly to database changes on your `live_matches` table. The moment a record keeper updates a score, the entire campus sees it update instantly.
* **TanStack (Query & Table):** Essential. **TanStack Table** handles the heavy lifting of sorting, filtering, and paginating dense player leaderboards (goals, assists, clean sheets). **TanStack Query** handles client-side caching and state synchronization, ensuring your client-side data doesn't get stale.
* **Cloudinary vs. Supabase Storage:**
> **Architectural Tip:** Since you're already in the Supabase ecosystem, consider using **Supabase Storage** for player headshots and team logos first. It integrates natively with your Postgres Row Level Security (RLS) policies. Only bring in Cloudinary if you need advanced, on-the-fly image transformations or automatic video transcoding for match highlights.



---

## What Could We Be Missing? (The Real-World Gaps)

When you take an app from localhost to a live pitch or court, human error and infrastructure limits will try to break it. Here are four critical features most sports builds miss early on:

### 1. Pitch-Side Offline Resilience

Campus network signals near sports fields can be notoriously spotty. If a record keeper hits `+ Goal` and their connection drops, a standard API call will hang, crash, or double-submit when they frantically tap it again.

* **The Fix:** Implement an **optimistic UI** strategy using TanStack Query. Keepers' inputs should update their local screen instantly and queue database syncs in the background, utilizing `localStorage` or IndexedDB as a temporary buffer if the network drops completely.

### 2. The "Undo" Log / Transaction Ledger

Recording live sports is high-pressure. Keepers *will* select the wrong player for a goal, award a card to the wrong team, or double-tap a button.

* **The Fix:** Do not just update absolute values (e.g., `goals = goals + 1`). Design an **events ledger** schema (`match_events` table) tracking things like: `{ type: "goal", minute: 42, player_id: "x" }`. This makes rolling back accidental entries as simple as deleting the last row in the ledger, with DB triggers automatically recalculating the current score.

### 3. Automated Disciplinary Rules (Suspensions)

If a player gets a straight red card or accumulates a threshold of yellow cards across matches, they must be suspended for the next match.

* **The Fix:** Build database logic or edge functions that automatically calculate eligibility. If a player is flagged as `suspended: true`, the Record Keeper's UI should programmatically prevent them from being drafted into the matchday lineup.

### 4. Instant Campus Distribution (The "WhatsApp Blast")

Students don't want to keep refreshing a browser tab to check if a match started. They live on messaging apps.

* **The Fix:** Use a Supabase Edge Function triggered by a database event (e.g., when `match_status` changes to `'finished'`) to hit a webhook that automatically formats a stylized text recap and blasts it directly to department WhatsApp or Telegram channels.

---

If you are planning to handle live score updates, setting up database subscriptions correctly is key. [This Supabase Realtime Tutorial](https://www.youtube.com/watch?v=TVp_GEiAcDY) walks through exactly how to configure your database to broadcast real-time updates to your frontend, which will be essential for syncing those pitch-side goal logs with the student dashboard.
We are shifting into serious software engineering territory. By introducing **Live Win Probability**, **Deep SofaScore-Style Profiles**, and **Integrated Match-Timer Controls**, you are designing a high-integrity, production-grade platform.

Let's break down these three new core capabilities, how the business logic works, and how to structure them.

---

## 📈 1. Double-Bar Win Probability Engine

To display a highly engaging, dual-metric "Win Probability" card on each match page (similar to professional sports networks), we will track two distinct data streams.

```
       [ --- WIN PROBABILITY --- ]
📊 ALGO:   [ HOME 45% ]  [ DRAW 20% ]  [ AWAY 35% ]
🗳️ VOTES:  [ HOME 65% ]                [ AWAY 35% ]

```

### Bar 1: Historical Algo Probability (H2H & Strength)

Since the system is manual, we cannot use complex Expected Goals (xG). Instead, we will calculate a lightweight, highly accurate statistical **Elo Rating** for each team.

* **The Math:** Every team starts the season with `1000` points. After each game, points are transferred from the loser to the winner based on the margin of victory and how "unexpected" the outcome was.
* **The Probability Formula:** If Team A (Rating $R_A$) plays Team B (Rating $R_B$), the expected win probability $E_A$ is calculated using a logistic curve:

$$E_A = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$


* **The Trigger:** A Postgres database function recalculates team ratings at the end of every completed match and updates a static `win_probability` JSONB column on upcoming matches.

### Bar 2: Student Fan Voting (Requires Auth)

To prevent botting, spamming, and duplicate voting, student voting requires an account.

* We can easily enforce this by validating signups against university matriculation numbers or student emails (similar to the digital election protocol used in your department's portals ).


* **The Flow:** Once a student logs in, they can tap **Home Win**, **Draw**, or **Away Win** on an upcoming match page.
* **Database Schema:**
```sql
CREATE TABLE match_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Ties to Student Auth Table
    vote VARCHAR(10) CHECK (vote IN ('home', 'draw', 'away')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(match_id, user_id) -- One vote per student per match
);

```



---

## 📇 2. SofaScore-Style Profiles (Players & Clubs)

To make the site feel like an authentic sports archive, we need rich, deeply nested dashboards.

### A. The Club Profile

Every club (e.g., *Computer Science FC*) has a profile displaying three core tabs:

1. **Overview (The SofaScore Dashboard):**
* **Current Form:** A row of colored dots: `[W] [W] [D] [L] [W]` representing the last 5 games.
* **Team Stats:** Total Goals Scored, Goals Conceded, Clean Sheets, Average Possession (if tracked), and Total Cards.
* **Roster List:** Grouped by position (Goalkeepers, Defenders, Midfielders, Attackers) showing shirt numbers.


2. **Fixtures & Results:**
* Chronological feed of all matches in the current season, filterable by tournament category (e.g., *Dean's Cup, Friendly, Inter-Faculty League*).


3. **Standings:**
* A live, auto-updating league table where the club is highlighted.



### B. The Player Profile

Every athlete gets a fully detailed sports resume:

1. **Identity:** Name, Department, Active Jersey Number, Profile Photo, and "Primary Sport" (along with affiliations to any secondary sports they play).
2. **SofaScore Performance Map:**
* **Football:** Appearances, Goals, Assists, Goals-Per-Game ratio, Cards, and Goalkeeper-specific stats (Clean Sheets, Goals Conceded).
* **Basketball:** Games Played, Average Points Per Game (PPG), Total 3-Pointers, and Team Fouls.
* **Tennis:** Match Win/Loss record, Set Win/Loss record, and tournament trophies.


3. **Match Log:** A dynamic table showing their match-by-match performance rating or direct contributions (e.g., *Match vs. Mech Eng: Played 90', Scored 2 Goals, 1 Assist*).

---

## ⏱️ 3. Automatic Match-Timer & Injury Time Tracker

To solve the issue of erratic, subjective injury time tracking, we will integrate **automatic timekeeping directly into the Record Keeper's UI**.

The Record Keeper will see a continuous live match clock. Next to it, they have a giant **`[PAUSE / TIME LOST]`** button.

```
       [ MATCH KEEPER UI ]
 ┌───────────────────────────────┐
 │       LIVE MATCH TIME         │
 │           41:24               │
 ├───────────────────────────────┤
 │  [ PLAY ]     [❚❚ TIME LOST]  │ ◄── Tapped during injuries/fouls
 ├───────────────────────────────┤
 │ Current Accumulated Time Lost:│
 │            01:45              │
 └───────────────────────────────┘

```

### How the Time-Tracking Workflow Logic Operates:

1. **The Live Clock:** When the referee blows the whistle to start the game, the keeper taps `[PLAY]`. The client starts a high-precision JavaScript timer.
2. **Logging Interruptions:** If a foul, injury, or goal celebration occurs:
* The keeper taps `[❚❚ TIME LOST]`.
* The main match clock **keeps running** (since soccer match clocks do not stop).
* A secondary timer starts counting **Time Lost (Accumulated Injury Time)**.
* When play resumes, the keeper taps `[PLAY]` again, which pauses the time-lost counter and locks in the seconds lost.


3. **Dynamic Socket Streaming:** Every second, both the running match time (e.g., `41:24`) and the accumulated extra time (e.g., `+1:45`) are synced to the server. The student-facing frontend shows the main match clock with a small, pulsing indicator: `41:24 (+2m Injury Time Expected)`.
4. **Automatic Half-Time Calculations:** At the end of 45 minutes, the system automatically rounds the accumulated time lost to the nearest minute (e.g., `105 seconds` $\rightarrow$ `2 minutes` of extra time) and flags a notification to the keeper and students: *“Minimum of 2 minutes added time.”*

### The Database Event Schema:

Whenever a keeper pauses or plays the clock, it registers a timestamped event to ensure the exact game-minutes are logged for match events:

```sql
CREATE TABLE match_clock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    event_type VARCHAR(20), -- 'start', 'stop_time_lost', 'resume_play', 'end_period'
    match_time VARCHAR(10), -- The exact clock time when clicked (e.g., "41:24")
    accumulated_lost_ms INTEGER, -- Total milliseconds of time lost at this point
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

```

This prevents keeper bias, standardizes game durations, and ensures your campus league runs with professional-grade tournament precision.
To build a robust, end-to-end sports portal that captures all the thrill of campus athletics, we have to design the system to handle the chaotic reality of live matches.

Since human record keepers are running the show, we must build a system that is incredibly forgiving of human error while maintaining strict data integrity.

Here is the plan to model your core entities, handle complex sports rules, and stream updates to students instantly.

---

## 🗄️ Core Database Architecture (Postgres/Supabase Model)

To make sure we can track statistics across different sports, departments, and varying tournament styles, the database needs to be highly structured.

Below is the relational database schema designed to support leagues, knockout cups, individual athletes, and multi-sport rosters.

```sql
-- 1. Departments Registry
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., "Computer Science"
    short_code VARCHAR(10) UNIQUE NOT NULL -- e.g., "CSC"
);

-- 2. Sports Registry (Stores rules per sport)
CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., "Football", "Basketball", "Tennis", "Track"
    type VARCHAR(20) NOT NULL, -- "team" or "individual"
    score_type VARCHAR(20) NOT NULL -- "points" (football/basketball), "sets" (tennis), "time" (track)
);

-- 3. Clubs/Teams (Tied to a department and a specific sport)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g., "CSC FC" or "MEC Giants"
    logo_url TEXT,
    UNIQUE(department_id, sport_id) -- A department has exactly one team per sport
);

-- 4. Central Player Database
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    matric_number VARCHAR(50) UNIQUE,
    avatar_url TEXT
);

-- 5. Player-Sport Registry (Allows a student to play multiple sports)
CREATE TABLE player_sport_registry (
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    jersey_number INTEGER,
    PRIMARY KEY (player_id, team_id)
);

-- 6. Tournaments/Competitions (Cup, League, Friendly, etc.)
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL, -- e.g., "Vice Chancellor's Cup 2026"
    sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- "league", "knockout_cup", "friendly"
    rules JSONB NOT NULL -- e.g., {"extra_time": true, "penalty_shootout": true}
);

-- 7. Matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES teams(id), -- Nullable for individual sports like Track
    away_team_id UUID REFERENCES teams(id),
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'live', 'paused', 'completed'
    current_period VARCHAR(50) DEFAULT 'not_started', -- 'half_1', 'quarter_3', 'overtime', 'penalties'
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 8. Match Events (The single source of truth for all live feeds & calculations)
CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id), -- The team that triggered the event
    player_id UUID REFERENCES players(id), -- The player who triggered the event
    event_type VARCHAR(50) NOT NULL, -- 'goal', 'assist', 'foul', 'yellow_card', '3_pointer', 'point', 'disallowed'
    period VARCHAR(50) NOT NULL,
    match_time VARCHAR(10) NOT NULL, -- e.g. "45+2" or "Q3 08:12"
    details JSONB, -- Dynamic details (e.g., {"is_penalty": true, "original_event_id": "..."})
    is_void BOOLEAN DEFAULT FALSE, -- Set to TRUE if the event is overturned (disallowed)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

```

---

## 🛠️ Handling Sport-Specific Intricacies & Edge Cases

When you move from a theoretical app to the pitch, sports rules get messy. Here is how our database and interfaces must handle these real-world scenarios:

### 1. Football (Soccer) Edge Cases

* **The Disallowed Goal (VAR Rule):** If a keeper logs a goal, and the referee disallows it 60 seconds later (e.g., offside or foul), **never delete the DB row.** Deleting rows breaks live-ticker indices and wrecks clients caching the data. Instead, insert a new event with `event_type: 'disallowed'` pointing to the original goal's ID in the `details` column, and set `is_void: true` on the original goal. Your database trigger should then recalculate the live score.
* **Extra Time & Penalties (Cup Rules):** If `tournaments.rules` has `{"extra_time": true}`:
* If a Cup match is tied at 90', the system automatically advances the state to `extra_time_1` (15m) and `extra_time_2` (15m).
* If still tied, the match status becomes `penalties`. The Record Keeper UI shifts into a **Shootout Interface** (simple binary clicker: *Team A: Kick 1 [Score/Miss]*). Shootout goals **do not** count toward the standard player seasonal statistics or regular match score. They are stored in `match_events` under `event_type: 'penalty_shootout_kick'` to preserve the clean sheet data and player stats.



### 2. Basketball Overtime (OT)

* Unlike football, basketball matches *cannot* end in a tie.
* If the score is level at the end of the 4th Quarter (Q4), the system must lock the match in a "Live" state and spin up a 5-minute `overtime` period. If it's still tied after 5 minutes, it spawns `overtime_2`, repeating indefinitely until a winner is decided.

### 3. Lawn Tennis Set & Tiebreak Logic

Tennis scoring is a nightmare to record manually if the keeper has to calculate sets and games.

* **The Clicker Rule:** The Record Keeper only has two buttons: `[Point Player A]` and `[Point Player B]`.
* The system uses an **isolated scoring state machine** in the backend. When a player reaches 6 games each (6-6), the state machine automatically transitions the match to "Tiebreak Mode." The scoring changes from standard `15 -> 30 -> 40 -> Game` to sequential integers (`1, 2, 3...`) where the first to 7 points (by a margin of at least 2) wins the set.

### 4. Track & Field (Running) Heats vs. Finals

Track doesn't use standard head-to-head structures. It uses **events** containing **heats** (qualifiers) leading to the **finals**.

* The database represents these matches with a null `away_team_id`.
* Instead of `home_score` and `away_score`, we use a secondary table `track_results` that maps a `player_id` to their lane, heat number, finished rank, and precise race time (e.g., `10.58` seconds).

---

## ⚡ The Real-Time Architecture: Standard to Screen in 100ms

To display these updates live to students as they happen, we bypass traditional database polling (which would crash your server if hundreds of students are constantly refreshing).

Instead, we use a **WebSocket Pub/Sub (Publish/Subscribe)** architecture:

```
[Record Keeper Client]
         │
         ▼ (HTTPS POST /match-events)
   [Your API Server] 
         │
         ├──► Write to PostgreSQL (Calculates new score via triggers)
         │
         ▼ (Realtime Broadcast / Postgres Changes)
[Supabase / WebSocket Channel] 
         │
         ├───────────────┬───────────────┐
         ▼               ▼               ▼
  [Student App]   [Student App]   [Student App]
 (Match Center)  (Live Scoreboard) (Telegram/WA Bot)

```

### How to implement this seamlessly:

1. **Database Replication:** Turn on logical replication for your `matches` and `match_events` tables.
2. **Client-Side Subscription:** On the student's Live Match Center page, subscribe directly to the specific match ID channel:
```javascript
const matchSubscription = supabase
  .channel(`match:${matchId}`)
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'match_events', 
    filter: `match_id=eq.${matchId}` 
  }, (payload) => {
     // 1. Play "Ref Whistle" sound effect or vibrate phone if a goal is scored
     // 2. Append payload to the live event ticker list
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'matches',
    filter: `id=eq.${matchId}`
  }, (payload) => {
     // Update the main scoreboard header (home_score / away_score / current_period)
  })
  .subscribe();

```


3. **UI Feedback:** When a new goal event arrives via WebSockets, trigger a quick 1-second glowing animation on the changed score digit. This gives the live, dynamic feel of the Premier League Match Centre.


I also need a mechanism for seeding players info, departments, clubs, competitions, sports. But we'll add fake data first of all to see what it'll look like.


